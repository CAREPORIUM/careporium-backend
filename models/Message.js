import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

// Supports fetching each conversation's messages in chronological order.
messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);