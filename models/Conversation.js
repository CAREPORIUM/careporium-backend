import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    professionalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true
    },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Keep one conversation room for each user-professional pair.
conversationSchema.index({ userId: 1, professionalId: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);