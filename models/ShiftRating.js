import mongoose from "mongoose";

// Store each rating separately so one completed shift can produce feedback both ways.
const shiftRatingSchema = new mongoose.Schema({
    shift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift",
        required: true,
        index: true
    },
    // Account identity comes from the verified JWT; profile IDs identify the displayed profiles.
    raterUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    raterRole: {
        type: String,
        enum: ["worker", "facility"],
        required: true
    },
    raterProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // Keep both account and profile IDs for reliable authorization and profile summaries.
    ratedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    ratedRole: {
        type: String,
        enum: ["worker", "facility"],
        required: true
    },
    ratedProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // Ratings use a five-star scale; written feedback is optional.
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Optional per-category scores that only apply when a worker rates a facility.
    workEnvironment: { type: Number, min: 1, max: 5 },
    shiftAccuracy: { type: Number, min: 1, max: 5 },
    staffSupport: { type: Number, min: 1, max: 5 },
    paymentExperience: { type: Number, min: 1, max: 5 },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
    }
}, { timestamps: true });

// Each participant may submit at most one rating for a particular completed shift.
shiftRatingSchema.index({ shift: 1, raterUser: 1 }, { unique: true });
// This index speeds up a profile's paginated rating history and summary lookup.
shiftRatingSchema.index({ ratedRole: 1, ratedProfileId: 1, createdAt: -1 });

export default mongoose.model("ShiftRating", shiftRatingSchema);