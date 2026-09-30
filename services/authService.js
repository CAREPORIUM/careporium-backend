import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import { transporter } from './emailService.js';

// create a new worker account
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

    try {
        // check if email already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error("Email already exists!");
        }

        // hash password
        const genSalt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, genSalt);

        // create user account
        const user = await User.create({
            email,
            phoneNumber,
            password: hashedPassword,
            role: "worker"
        });

        // generate a 6-digit verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // OTP expires in 5 minutes
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        // save OTP and expiry
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
            location
        });

        // send verification email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject: 'Verify your Careporium account',
                text: `Your Careporium verification code is ${otp}. It expires in 5 minutes.`
            });
        } catch (emailError) {
            // Remove the created user and worker if email fails
            await Worker.deleteOne({ _id: worker._id });
            await User.deleteOne({ _id: user._id });

            throw new Error("Account could not be created because the verification email could not be sent.");
        }

        return {
            userId: user._id,
            workerId: worker._id,
        };

    } catch (error) {
        throw error;
    }
};

// verify registered user's account using OTP sent to the user's email
const verifyAccount = async (email, otp) =>{
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error('User not found')
    }

    if (user.isVerified) {
        throw new Error("Account is already verified");
    }

    if (!user.verificationOtp || !user.verificationOtpExpires) {
        throw new Error("Verification OTP not found");
    }

    if (user.verificationOtpExpires < new Date()) {
        throw new Error("Verification OTP has expired");
    }

    if (user.verificationOtp !== otp) {
        throw new Error("Invalid verification OTP");
    }

    // mark the account as verified
    user.isVerified = true;

    // Remove the OTP after successful verification
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;

    await user.save();

    return {
        userId: user._id,
        email: user.email,
        isVerified: user.isVerified
    };

}

// Generates and sends a new verification OTP to the user's email.

const resendVerificationOtp = async (email) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.isVerified) {
        throw new Error("Account is already verified");
    }

    // Generate a new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 5 minutes
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Save the new OTP
    user.verificationOtp = otp;
    user.verificationOtpExpires = otpExpires;

    await user.save();

    // Send the new OTP
    await transporter.sendMail({
        from: `"Careporium" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: "Your new Careporium verification code",
        text: `Your new Careporium verification code is ${otp}. It expires in 5 minutes.`
    });

    return {
        message: "A new verification code has been sent to your email"
    };
};

// worker login
const loginUser = async (loginData)=> {
   const { email, password } = loginData;
   
   // find user by email
   const user = await User.findOne({ email });
   const isPasswordValid = await bcrypt.compare(password, user.password); // encrypt and compare password

   // check if user exists and password is valid
   if (!user || !isPasswordValid) {
    throw new Error("Invalid email or password");
   }

   // check account verification status
   if (!user.isVerified) {
    throw new Error("Your account is not verified. Please check your email for verification link.");
   }

   // create token for the logged in user
   const token = jwt.sign({
    id: user._id,
    role: user.role
   },
   process.env.JWT_SECRET, 
   {
    expiresIn: process.env.JWT_EXPIRES_IN
   });

   return { 
    user: {
     id: user._id,
     email: user.email,
     role: user.role,
     token,
    }
   }

}

//delete user
const deleteUser = async (userId) => {

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    // Delete worker profile if the user is a worker
    if (user.role === "worker") {
        await Worker.findOneAndDelete({ user: userId });
    }

    // Delete the main user account
    await User.findByIdAndDelete(userId);

    return {
        message: "User deleted successfully"
    };
};


export { registerWorker, verifyAccount, resendVerificationOtp, loginUser, deleteUser }