import mongoose from "mongoose";

// Mongoose schema for a User account. This is the login/identity record shared
// by both workers and facilities; the role-specific profile data lives in the
// separate Worker and Facility models (linked via the `user` field).
// Email verification is handled with a one-time code (OTP) that expires.
const userSchema = new mongoose.Schema(
    {
        // Login email — unique, stored lowercase and trimmed.
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Contact phone number (required).
        phoneNumber: {
            type: String,
            required: true
        },

        // Bcrypt-hashed password (never store plain text).
        password: {
            type: String,
            required: true
        },

        // Account type: "worker", "facility", or "admin". Drives authorization.
        role: {
            type: String,
            enum: ["worker", "facility", "admin"],
            required: true
        },

        // Whether the email address has been verified via OTP.
        isVerified: {
            type: Boolean,
            default: false
        },

        // One-time email verification code (set during registration/resend).
        verificationOtp: {
            type: String
        },

        // When the verification OTP expires (5 minutes after it is issued).
        verificationOtpExpires: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;