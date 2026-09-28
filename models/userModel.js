import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true},
        phoneNumber: { type: String, required: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['worker', 'facility', 'admin'], required: true },
        isVerified: { type: Boolean, default: false }
    },
        { timestamps: true }
)

export default userSchema;