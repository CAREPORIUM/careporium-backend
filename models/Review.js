import mongoose from "mongoose";

// Each review belongs to one professional and is constrained to a 1-5 rating.
const reviewSchema = new mongoose.Schema({
    professionalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true,
        index: true
    },
    reviewerName: { type: String, required: true, trim: true },
    reviewerRole: { type: String, default: "", trim: true },
    reviewerAvatar: { type: String, default: "" },
    facilityName: { type: String, default: "", trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

reviewSchema.index({ professionalId: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);