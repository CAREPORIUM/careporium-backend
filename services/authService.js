import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import cloudinary from '../config/cloudinary.js';
import { transporter } from './emailService.js';

// register worker
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


    // check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error('Email already exists!');
    }


    // hash password
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


    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // save OTP
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
            address: location.address,
            street: location.street,
            state: location.state,
            country: location.country
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

        // Roll back both records if email fails
        await Worker.deleteOne({ _id: worker._id });
        await User.deleteOne({ _id: user._id });

        throw new Error(
            'Account could not be created because the verification email could not be sent.'
        );
    }

    return {
        userId: user._id,
        workerId: worker._id
    };
};



// register facility

const registerFacility = async (req) => {
    const {
        facilityName,
        facilityType,
        email,
        phoneNumber,
        password,
        location,
        secondaryContact
      } = req.body;


    // check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error('This business email already exists!');
    }

    // check required documents
    if (
        !req.files ||
        !req.files.businessRegCert ||
        !req.files.facilityLicense ||
        !req.files.TaxID
    ) {
        throw new Error(
            'Business registration certificate, facility license and Tax ID are required.'
        );
    }

    // hash password
    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    // upload business registration certificate
    const businessRegCertUpload =
        await cloudinary.uploader.upload(
            req.files.businessRegCert[0].path
        );

    // upload facility license
    const facilityLicenseUpload =
        await cloudinary.uploader.upload(
            req.files.facilityLicense[0].path
        );

    // upload Tax ID
    const TaxIDUpload =
        await cloudinary.uploader.upload(
            req.files.TaxID[0].path
        );

    const businessRegCert = businessRegCertUpload.secure_url;
    const facilityLicense = facilityLicenseUpload.secure_url;
    const TaxID = TaxIDUpload.secure_url;

    // create facility user account
    const user = await User.create({
        email,
        phoneNumber,
        password: hashedPassword,
        role: 'facility',
        isVerified: false
    });


    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // save OTP
    user.verificationOtp = otp;
    user.verificationOtpExpires = otpExpires;

    await user.save();


    // create facility profile
    const facility = await Facility.create({
        user: user._id,
        facilityName,
        facilityType,
        location: {
            address: location.address,
            street: location.street,
            state: location.state,
            country: location.country
        },
        businessRegCert,
        facilityLicense,
        TaxID,
        secondaryContact: {
            fullName: secondaryContact.fullName,
            position: secondaryContact.position,
            email: secondaryContact.email,
            phoneNumber: secondaryContact.phoneNumber
        }
    });

    // send verification OTP
    try {

        await transporter.sendMail({
            from: `"Careporium" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Verify your Careporium facility account',
            text: `Your Careporium facility verification code is ${otp}. It expires in 5 minutes.`
        });

    } catch (emailError) {
        // roll back both records if email fails
        await Facility.deleteOne({ _id: facility._id });
        await User.deleteOne({ _id: user._id });

        throw new Error(
            'Facility account could not be created because the verification email could not be sent.'
        );
    }
    return {
        userId: user._id,
        facilityId: facility._id
    };
};

// verify user account
const verifyAccount = async (email, otp) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.isVerified) {
        throw new Error('Account is already verified');
    }
    if (!user.verificationOtp || !user.verificationOtpExpires) {
        throw new Error('Verification OTP not found');
    }
    // check OTP expiry
    if (user.verificationOtpExpires < new Date()) {
        throw new Error('Verification OTP has expired');
    }
    // check OTP
    if (user.verificationOtp !== otp) {
        throw new Error('Invalid verification OTP');
    }

    // verify account
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
}



// resend verification OTP
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
    })
    return {
        message: 'A new verification code has been sent to your email'
    };
};

// login user

const loginUser = async (loginData) => {
    const {
        email,
        password
    } = loginData;
    
    const user = await User.findOne({ email });
    const isPasswordValid = await bcrypt.compare(password, user.password); // encrypt and compare password
    
    if (!user || !isPasswordValid) {
        throw new Error('Invalid email or password');
      }

    /* * // check account verification
    if (!user.isVerified) {
        throw new Error(
            'Your account is not verified. Please check your email for your verification code.'
        );
    }  */

    // Generate JWT
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



// ==========================================
// DELETE USER
// ==========================================

const deleteUser = async (userId) => {

    // Find user
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }


    // Delete worker profile
    if (user.role === 'worker') {

        await Worker.findOneAndDelete({
            user: userId
        });

    }


    // Delete facility profile
    if (user.role === 'facility') {

        await Facility.findOneAndDelete({
            user: userId
        });

    }


    // Delete user account
    await User.findByIdAndDelete(userId);


    return {
        message: 'User deleted successfully'
    };
};



// ==========================================
// EXPORT SERVICES
// ==========================================

export {
    registerWorker,
    registerFacility,
    verifyAccount,
    resendVerificationOtp,
    loginUser,
    deleteUser
};

