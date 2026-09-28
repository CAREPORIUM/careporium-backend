import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        fullName: { type: String, required: true, trim: true },
        profession: { type: String },
        specialty: { type: String },
        yearsOfExperience: { type: Number, min: 0 },
        location: { 
            address: { type: String },
            city: { type: String },
            state: { type: String },
        },
        certifications: { type: String, default: '' }
    }, { timestamps: true }
)

const Worker = mongoose.model('Worker', workerSchema);

export default Worker;