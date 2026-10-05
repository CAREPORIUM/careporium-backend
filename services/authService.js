import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import cloudinary from '../config/cloudinary.js';
import { transporter } from './emailService.js';


// register a new worker
const registerWorker = async (workerData) => {
    const {
        fullName,
        email,
        phoneNumber,
        password,
        profession,
        specialty,
        yearsOfExperience,
        location
    } = workerData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Email already exists!');
    }

    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    // create user account
    const user = await User.create({
        email,
        phoneNumber,
        password: hashedPassword,
        role: 'worker',
        isVerified: false
    });

    // generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // set OTP to expire 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // save OTP in the user document to compare later during verification
    user.verificationOtp = otp;
    user.verificationOtpExpires = otpExpires;

    await user.save();

    // create worker profile
    const worker = await Worker.create({
        user: user._id,
        fullName,
        profession,
        specialty,
        yearsOfExperience,
        location: {
            address: location?.address,
            street: location?.street,
            state: location?.state,
            country: location?.country
        }
    });

    // send verification email
    try {
        await transporter.sendMail({
            from: `"Careporium" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Verify your Careporium account',
            text: `Your Careporium verification code is ${otp}. It expires in 5 minutes.`
        });
    } catch (emailError) {
        // roll back both records if email fails by deleting entries from the database
        await Worker.deleteOne({ id: worker._id });
        await User.deleteOne({ _id: user._id});
        throw new Error(
            'Account could not be created because the verification email could not be sent.'
        );
    }
    return {
        userId: user._id,
        workerId: worker._id
    };
};


// register a new facility
const registerFacility = async (req) => {
    const {
        facilityName,
        facilityType,
        email,
        phoneNumber,
        password
    } = req.body;

    const location = {
        address: req.body['location.address'],
        city: req.body['location.city'],
        state: req.body['location.state'],
        country: req.body['location.country']
    };

    const secondaryContact = {
        fullName: req.body['secondaryContact.fullName'],
        position: req.body['secondaryContact.position'],
        email: req.body['secondaryContact.email'],
        phoneNumber: req.body['secondaryContact.phoneNumber']
    };

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error('This business email already exists!');
    }

    // check required documents
    if (
        !req.files ||
        !req.files.businessRegCert ||
        !req.files.facilityLicense ||
        !req.files.taxID
    ) {
        throw new Error(
            'Business registration certificate, facility license and Tax ID are required.'
        );
    }

    // hash password
    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash( password, genSalt);


    // upload business registration certificate
    const businessRegCertUpload = await cloudinary.uploader.upload(
            req.files.businessRegCert[0].path
        );

    // upload facility license
    const facilityLicenseUpload = await cloudinary.uploader.upload(
            req.files.facilityLicense[0].path
        );

    // upload Tax ID
    const taxIDUpload = await cloudinary.uploader.upload(
            req.files.taxID[0].path
        );

    const businessRegCert_URL = businessRegCertUpload.secure_url;

    const facilityLicense_URL = facilityLicenseUpload.secure_url;

    const taxID_URL = taxIDUpload.secure_url;

    const session = await mongoose.startSession();

    // start a MongoDB session and transaction to ensure the User and Facility records are created together
    // if either operation fails, the transaction can be rolled backto prevent a partial facility registration
    try {
        session.startTransaction();

        // create facility user account
        const users = await User.create(
            [{
                email,
                phoneNumber,
                password: hashedPassword,
                role: 'facility',
                isVerified: false
            }],
            { session }
        );

        const user = users[0];


        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // OTP expires in 5 minutes
        const otpExpires = new Date( Date.now() + 5 * 60 * 1000);

        // Save OTP
        user.verificationOtp = otp;
        user.verificationOtpExpires = otpExpires;

        await user.save({ session });

        // Create facility profile
        const facilities = await Facility.create(
            [{
                user: user._id,
                facilityName,
                facilityType,
                location: {
                    address: location.address,
                    city: location.city,
                    state: location.state,
                    country: location.country
                },
                secondaryContact: {
                    fullName: secondaryContact.fullName,
                    position: secondaryContact.position,
                    email: secondaryContact.email,
                    phoneNumber: secondaryContact.phoneNumber
                },
                businessRegCert: {
                    businessRegCert_URL
                },
                facilityLicense: {
                    facilityLicense_URL
                },
                taxID: {
                    taxID_URL
                }
            }],
            { session }
        );

        const facility = facilities[0];

        await session.commitTransaction();

        await session.endSession();
      

        // send verification OTP
        try {

            await transporter.sendMail({
                from: `"Careporium" <${process.env.EMAIL_FROM}>`,
                to: user.email,
                subject: 'Verify your Careporium facility account',
                text: `Your Careporium facility verification code is ${otp}. It expires in 5 minutes.`
            });
        } catch (emailError) {
            console.error(
                'Verification email could not be sent:',
                emailError
            );
        }

        return {
            userId: user._id,
            facilityId: facility._id
        };

    } catch (error) {

        await session.abortTransaction();

        await session.endSession();


        // clean up Cloudinary uploads if database creation fails
        try {

            if (businessRegCertUpload?.public_id) {
                await cloudinary.uploader.destroy(businessRegCertUpload.public_id);
            }

            if (facilityLicenseUpload?.public_id) {
                await cloudinary.uploader.destroy(facilityLicenseUpload.public_id);
            }
            if (taxIDUpload?.public_id) {
                await cloudinary.uploader.destroy(taxIDUpload.public_id);
            }
        } catch (cloudinaryError) {
            console.error('Cloudinary cleanup failed:',cloudinaryError);
        }
        throw error;
    }
};


// verify user account using OTP sent to user's email
const verifyAccount = async (email, otp) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.isVerified) {
        throw new Error('Account is already verified');
    }
    if (
        !user.verificationOtp ||
        !user.verificationOtpExpires
    ) {
        throw new Error('Verification OTP not found');
    }
    if (user.verificationOtpExpires < new Date()) {
        throw new Error('Verification OTP has expired');
    }

    // Check OTP
    if (user.verificationOtp !== otp) {
        throw new Error('Invalid verification OTP');
    }

    // Verify account
    user.isVerified = true;

    // clear OTP after successful verification
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;

    await user.save();

    return {
        userId: user._id,
        email: user.email,
        isVerified: user.isVerified
    };
};


// resend verification OTP to user's email if the previous OTP has expired or was not received
const resendVerificationOtp = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.isVerified) {
        throw new Error('Account is already verified');
    }

    // generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // save new OTP
    user.verificationOtp = otp;
    user.verificationOtpExpires = otpExpires;

    await user.save();

    // send new OTP
    await transporter.sendMail({
        from: `"Careporium" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Your new Careporium verification code',
        text: `Your new Careporium verification code is ${otp}. It expires in 5 minutes.`
    });

    return {
        message: 'A new verification code has been sent to your email'
    };
};


// login user and generate JWT for authentication
const loginUser = async (loginData) => {
    const {
        email,
        password
    } = loginData;

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    // check if account is verified
    if (!user.isVerified) {
        throw new Error(
            'Your account is not verified. Please check your email for your verification code.'
        );
    }

    // generate JWT
    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

    return {
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
        },
        token
    };
};


// get user profile by user ID, excluding sensitive fields like password and OTP
const getProfile = async (userId) => {
    const user = await User.findById(userId).select(
        '-password -verificationOtp -verificationOtpExpires'
    );

    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

// delete user account and associated worker or facility profile
const deleteUser = async (userId) => {
    // find user
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }
    // delete worker profile
    if (user.role === 'worker') {
        await Worker.findOneAndDelete({ user: userId });
    }
    // delete facility profile
    if (user.role === 'facility') {
        await Facility.findOneAndDelete({user: userId });
    }

    // delete user account associated with the worker or facility profile
    await User.findByIdAndDelete(userId);

    return {
        message: 'User deleted successfully'
    };
};

export { registerWorker, registerFacility, verifyAccount, resendVerificationOtp, loginUser, getProfile, deleteUser };