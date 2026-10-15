import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt, randomBytes, createHash } from "crypto";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";
import { transporter } from "./emailService.js";


// register a new worker
const registerWorker = async (workerData) => {
    const {
        fullName,
        email,
        phoneNumber,
        password,
        profession,
        specialty,
        yearsOfExperience
    } = workerData;

    const location = {
    address: workerData['location.address'],
    street: workerData['location.street'],
    state: workerData['location.state'],
    country: workerData['location.country']
};

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        throw new Error('Email already exists!');
    }

    if (password.length < 8) {
        throw new Error(
            'Password must be at least 8 characters long'
        );
    }

    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    // create user account
    const user = await User.create({
        email: normalizedEmail,
        phoneNumber,
        password: hashedPassword,
        role: 'worker',
        isVerified: false,
    });

    // generate a 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

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
    } catch (error) {
        // roll back both records if email fails by deleting entries from the database
        await Worker.deleteOne({ _id: worker._id });
        await User.deleteOne({ _id: user._id });

        console.error('Verification email failed:', error.message);
        console.error('Email error code:', error.code);
        console.error('Email server response:', error.response);

        throw error;
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

    const normalizedEmail = email.trim().toLowerCase();

/* *const location = {
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
}; */

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        throw new Error('This business email already exists!');
    }

    if (!password || password.length < 8) {
        throw new Error(
            'Password must be at least 8 characters long'
        );
    }

    // hash password
    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    // generate a secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // OTP expires in 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    let user;
    let facility;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // create facility user account
        const users = await User.create(
            [{
                email: normalizedEmail,
                phoneNumber,
                password: hashedPassword,
                role: 'facility',
                isVerified: false,
                verificationOtp: otp,
                verificationOtpExpires: otpExpires
            }],
            { session }
        );

        user = users[0];

        // create facility profile
        const facilities = await Facility.create(
            [{
                user: user._id,
                facilityName,
                facilityType
            /** location: {
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
                } */
            }],
            { session }
        );

        facility = facilities[0];

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        throw error;

    } finally {
        await session.endSession();
    }

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

        throw new Error(
            'Facility account was created, but the verification email could not be sent. Please request a new verification code.'
        );
    }

    return {
        userId: user._id,
        facilityId: facility._id
    };
};


// verify user account using OTP sent to user's email
const verifyAccount = async (email, otp) => {
    if (!email || !otp) {
        throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({
        email: email.trim().toLowerCase()
    });

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

    // Check OTP
    if (user.verificationOtpExpires < new Date()) {
        throw new Error('Verification OTP has expired');
    }

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
    if (!email) {
        throw new Error('Email is required');
    }

    const user = await User.findOne({
        email: email.trim().toLowerCase()
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.isVerified) {
        throw new Error('Account is already verified');
    }

    // generate new OTP
    const otp = randomInt(100000, 1000000).toString();

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

    return;
};


// login user and generate JWT for authentication
const loginUser = async (loginData) => {
    const {
        email,
        password
    } = loginData;

    const user = await User.findOne({
        email: email.trim().toLowerCase()
    });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

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
            role: user.role,
            tokenVersion: user.tokenVersion ?? 0
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


// log out user
const logoutUser = async (userId) => {
    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: { tokenVersion: 1 }
        },
        { returnDocument: 'after' }
    );

    if (!user) {
        throw new Error('User not found');
    }

    return {
        message: 'Logout successful'
    };
};


// get user profile by user ID, excluding sensitive fields like password and OTP
const getProfile = async (userId) => {
    
    const user = await User.findById(userId).select(
        '-password -verificationOtp -verificationOtpExpires -resetPasswordOtp -resetPasswordOtpExpires -resetPasswordTokenHash -resetPasswordTokenExpires -isVerified'
    ) 

    if (!user) {
        throw new Error('User not found');
    }

    let profileName = null;
    let verificationStatus = null;

    if (user.role === 'worker') {
        const worker = await Worker.findOne({ user: userId });
        profileName = worker?.fullName || null;
        verificationStatus = worker?.verificationStatus || null;
    } else if (user.role === 'facility') {
        const facility = await Facility.findOne({ user: userId });
        profileName = facility?.facilityName || null;
        verificationStatus = facility?.verificationStatus || null;
    }

    return {
        ...user.toObject(),
        profileName, verificationStatus
    };
};


// forgot password
const forgotPassword = async (email) => {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        email: normalizedEmail
    });

    // a generic response to prevent the service from
    // revealing if an email address is registered or not
    const response = {
        message: 'If an account with the email exists, a password reset code has been sent'
    };

    if (!user) {
        return response;
    }

    // generate a secure 6-digit OTP
    let otp;
    let hashedOtp;
    let existingOtp;

    do {
        otp = randomInt(100000, 1000000).toString();

        // hash the OTP before saving it
        hashedOtp = createHash('sha256')
            .update(otp)
            .digest('hex');

        // ensure the OTP is not already active for another account
        existingOtp = await User.findOne({
            resetPasswordOtp: hashedOtp,
            resetPasswordOtpExpires: { $gt: new Date() }
        });
    } while (existingOtp);

    // clear any previous password reset token
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordTokenExpires = undefined;

    user.resetPasswordOtp = hashedOtp;

    // OTP expires in 10 minutes
    user.resetPasswordOtpExpires = new Date(
        Date.now() + 10 * 60 * 1000
    );

    // record when the code was last sent
    user.resetPasswordOtpLastSentAt = new Date();

    // require verification of the new code
    user.resetPasswordOtpVerified = false;

    await user.save();

    // send password reset OTP
    try {
        await transporter.sendMail({
            from: `"Careporium" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Reset Your Careporium Account Password',
            text: `Your Careporium password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`
        });
    } catch (emailError) {
        // clear reset details only if this OTP is still the active code
        await User.updateOne(
            {
                _id: user._id,
                resetPasswordOtp: hashedOtp
            },
            {
                $unset: {
                    resetPasswordOtp: 1,
                    resetPasswordOtpExpires: 1,
                    resetPasswordOtpLastSentAt: 1,
                    resetPasswordTokenHash: 1,
                    resetPasswordTokenExpires: 1
                },
                $set: {
                    resetPasswordOtpVerified: false
                }
            }
        );

        throw new Error(
            'Unable to send the password reset email. Please try again'
        );
    }

    return response;
};


// verify password reset OTP
const verifyResetCode = async (otp) => {
    if (
        !otp ||
        typeof otp !== 'string' ||
        !/^\d{6}$/.test(otp)
    ) {
        throw new Error('Invalid or expired password reset code');
    }

    // hash the submitted OTP to find the matching account
    const hashedOtp = createHash('sha256')
        .update(otp)
        .digest('hex');

    // generate a secure password reset token
    const resetToken = randomBytes(32).toString('hex');

    // hash the token before saving it
    const hashedResetToken = createHash('sha256')
        .update(resetToken)
        .digest('hex');

    const now = new Date();

    // atomically verify and consume the OTP
    const user = await User.findOneAndUpdate(
        {
            resetPasswordOtp: hashedOtp,
            resetPasswordOtpExpires: { $gt: now }
        },
        {
            $set: {
                resetPasswordTokenHash: hashedResetToken,
                resetPasswordTokenExpires: new Date(
                    Date.now() + 10 * 60 * 1000
                ),
                resetPasswordOtpVerified: false
            },
            $unset: {
                resetPasswordOtp: 1,
                resetPasswordOtpExpires: 1
            }
        },
        {
            new: true
        }
    );

    if (!user) {
        throw new Error('Invalid or expired password reset code');
    }

    return {
        message: 'Password reset code verified successfully',
        resetToken,
        expiresIn: 600
    };
};


// resend password reset OTP
const resendResetCode = async (email) => {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        email: normalizedEmail
    });

    // use a generic response to avoid revealing registered emails
    const response = {
        message: 'If an account with the email exists, a password reset code has been sent'
    };

    if (!user) {
        return response;
    }

    // prevent resending within 30 seconds
    if (
        user.resetPasswordOtpLastSentAt &&
        Date.now() - user.resetPasswordOtpLastSentAt.getTime() < 30 * 1000
    ) {
        throw new Error(
            'Please wait 30 seconds before requesting another code'
        );
    }

    // generate a new secure 6-digit OTP
    let otp;
    let hashedOtp;
    let existingOtp;

    do {
        otp = randomInt(100000, 1000000).toString();

        // hash the new OTP before saving it
        hashedOtp = createHash('sha256')
            .update(otp)
            .digest('hex');

        // ensure the OTP is not already active for another account
        existingOtp = await User.findOne({
            resetPasswordOtp: hashedOtp,
            resetPasswordOtpExpires: { $gt: new Date() }
        });
    } while (existingOtp);

    // invalidate any previous password reset token
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordTokenExpires = undefined;

    user.resetPasswordOtp = hashedOtp;

    // reset OTP expiry to 10 minutes
    user.resetPasswordOtpExpires = new Date(
        Date.now() + 10 * 60 * 1000
    );

    // record when the code was last sent
    user.resetPasswordOtpLastSentAt = new Date();

    // the new code must be verified separately
    user.resetPasswordOtpVerified = false;

    await user.save();

    // send the new password reset OTP
    try {
        await transporter.sendMail({
            from: `"Careporium" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Your New Careporium Password Reset Code',
            text: `Your new Careporium password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`
        });
    } catch (emailError) {
        // clear reset details only if this OTP is still the active code
        await User.updateOne(
            {
                _id: user._id,
                resetPasswordOtp: hashedOtp
            },
            {
                $unset: {
                    resetPasswordOtp: 1,
                    resetPasswordOtpExpires: 1,
                    resetPasswordOtpLastSentAt: 1,
                    resetPasswordTokenHash: 1,
                    resetPasswordTokenExpires: 1
                },
                $set: {
                    resetPasswordOtpVerified: false
                }
            }
        );

        throw new Error(
            'Unable to send the password reset email. Please try again'
        );
    }

    return response;
};


// reset password
const resetPassword = async (resetToken, newPassword) => {
    if (
        !resetToken ||
        typeof resetToken !== 'string' ||
        !newPassword ||
        typeof newPassword !== 'string'
    ) {
        throw new Error(
            'Reset token and new password are required'
        );
    }

    if (newPassword.length < 8) {
        throw new Error(
            'Password must be at least 8 characters long'
        );
    }

    // hash the submitted reset token
    const hashedResetToken = createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // atomically reset password and consume the reset token
    const user = await User.findOneAndUpdate(
        {
            resetPasswordTokenHash: hashedResetToken,
            resetPasswordTokenExpires: { $gt: new Date() }
        },
        {
            $set: {
                password: hashedPassword,
                resetPasswordOtpVerified: false
            },
            $unset: {
                resetPasswordOtp: 1,
                resetPasswordOtpExpires: 1,
                resetPasswordOtpLastSentAt: 1,
                resetPasswordTokenHash: 1,
                resetPasswordTokenExpires: 1
            },
            $inc: {
                tokenVersion: 1
            }
        },
        {
            new: true
        }
    );

    if (!user) {
        throw new Error('Invalid or expired password reset token');
    }

    return {
        message: 'Password reset successful. You may proceed to log in'
    };
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
        await Facility.findOneAndDelete({ user: userId });
    }

    // delete user account associated with the worker or facility profile
    await User.findByIdAndDelete(userId);

    return {
        message: 'User deleted successfully'
    };
};


export {
    registerWorker,
    registerFacility,
    verifyAccount,
    resendVerificationOtp,
    loginUser,
    logoutUser,
    getProfile,
    forgotPassword,
    verifyResetCode,
    resendResetCode,
    resetPassword,
    deleteUser
};