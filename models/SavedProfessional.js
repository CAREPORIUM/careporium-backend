import mongoose from "mongoose";

const savedProfessionalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    professionalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true
    }
}, { timestamps: true });

// A user can save a particular professional only once.
savedProfessionalSchema.index({ userId: 1, professionalId: 1 }, { unique: true });

export default mongoose.model("SavedProfessional", savedProfessionalSchema);