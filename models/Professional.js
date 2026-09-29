import mongoose from "mongoose";

// Embedded entries keep a professional's work history with their profile.
const experienceSchema = new mongoose.Schema({
    role: { type: String, required: true, trim: true },
    facility: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, trim: true }
}, { _id: false });

const professionalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    profileImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    bio: { type: String, default: "", trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    experience: { type: [experienceSchema], default: [] },
    skills: { type: [String], default: [] },
    location: {
        city: { type: String, default: "", trim: true },
        state: { type: String, default: "", trim: true }
    },
    openToShifts: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Professional", professionalSchema);