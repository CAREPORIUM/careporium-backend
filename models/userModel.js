import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phoneNumber: {
            type: String,
            default: ""
        },


        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["worker", "facility", "admin"],
            required: true
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        verificationOtp: {
            type: String
        },

        verificationOtpExpires: {
            type: Date
        },

        resetPasswordOtp: {
            type: String,
            default: undefined
        },

        resetPasswordOtpExpires: {
            type: Date,
            default: undefined
        },

        tokenVersion: {
        type: Number,
        default: 0
        },
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;