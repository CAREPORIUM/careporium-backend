import express from "express";
import mongoose from "mongoose";
import { authenticate, optionalAuthenticate } from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Professional from "../models/Professional.js";
import Review from "../models/Review.js";
import SavedProfessional from "../models/SavedProfessional.js";

const router = express.Router();

// Validate the URL ID once, then reuse the loaded record in the route handler.
const requireProfessional = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid professional ID" });
    }

    try {
        req.professional = await Professional.findById(req.params.id).lean();
        if (!req.professional) {
            return res.status(404).json({ message: "Professional not found" });
        }
        next();
    } catch (error) {
        next(error);
    }
};

router.get("/:id", optionalAuthenticate, requireProfessional, async (req, res, next) => {
    try {
        // Calculate review stats and the signed-in user's saved state concurrently.
        const [ratingStats, saved] = await Promise.all([
            Review.aggregate([
                { $match: { professionalId: new mongoose.Types.ObjectId(req.params.id) } },
                { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }
            ]),
            req.user
                ? SavedProfessional.exists({ userId: req.user.id, professionalId: req.params.id })
                : null
        ]);
        const stats = ratingStats[0] || { average: 0, count: 0 };
        const { _id, __v, createdAt, updatedAt, ...profile } = req.professional;

        res.json({
            profile: {
                id: String(_id),
                ...profile,
                rating: Number(stats.average.toFixed(1)),
                reviewCount: stats.count,
                isSaved: Boolean(saved)
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get("/:id/reviews", requireProfessional, async (req, res, next) => {
    try {
        // Bound page size to avoid returning too many review documents at once.
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
        const professionalId = new mongoose.Types.ObjectId(req.params.id);
        const [ratingCounts, reviews, total] = await Promise.all([
            Review.aggregate([
                { $match: { professionalId } },
                { $group: { _id: "$rating", count: { $sum: 1 } } }
            ]),
            Review.find({ professionalId })
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select("reviewerName reviewerRole reviewerAvatar facilityName rating comment createdAt")
                .lean(),
            Review.countDocuments({ professionalId })
        ]);
        // Include every star value, even when no review has that rating.
        const counts = new Map(ratingCounts.map((item) => [item._id, item.count]));
        const distribution = [5, 4, 3, 2, 1].map((rating) => {
            const count = counts.get(rating) || 0;
            return {
                rating,
                count,
                percentage: total ? Math.round((count / total) * 100) : 0
            };
        });
        const average = total
            ? ratingCounts.reduce((sum, item) => sum + item._id * item.count, 0) / total
            : 0;

        res.json({
            summary: { average: Number(average.toFixed(1)), total, distribution },
            reviews,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
});

router.post("/:id/save", authenticate, requireProfessional, async (req, res, next) => {
    try {
        // Upsert makes saving repeatable without creating duplicate bookmarks.
        await SavedProfessional.updateOne(
            { userId: req.user.id, professionalId: req.professional._id },
            { $setOnInsert: { userId: req.user.id, professionalId: req.professional._id } },
            { upsert: true }
        );
        res.json({ saved: true });
    } catch (error) {
        next(error);
    }
});

router.delete("/:id/save", authenticate, requireProfessional, async (req, res, next) => {
    try {
        await SavedProfessional.deleteOne({
            userId: req.user.id,
            professionalId: req.professional._id
        });
        res.json({ saved: false });
    } catch (error) {
        next(error);
    }
});

router.get("/:id/messages", authenticate, requireProfessional, async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
        const conversation = await Conversation.findOne({
            userId: req.user.id,
            professionalId: req.professional._id
        }).lean();

        if (!conversation) {
            // A new conversation has no messages yet, so return an empty page.
            return res.json({ conversationId: null, messages: [], pagination: { page, limit, total: 0 } });
        }

        const [messages, total] = await Promise.all([
            Message.find({ conversationId: conversation._id })
                .sort({ createdAt: 1, _id: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Message.countDocuments({ conversationId: conversation._id })
        ]);

        res.json({
            conversationId: String(conversation._id),
            messages,
            pagination: { page, limit, total }
        });
    } catch (error) {
        next(error);
    }
});

router.post("/:id/messages", authenticate, requireProfessional, async (req, res, next) => {
    try {
        const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
        if (!text || text.length > 2000) {
            return res.status(400).json({ message: "Message text must be between 1 and 2000 characters" });
        }

        // Create the conversation on the first message, or refresh its activity time.
        const conversation = await Conversation.findOneAndUpdate(
            { userId: req.user.id, professionalId: req.professional._id },
            {
                $set: { lastMessageAt: new Date() },
                $setOnInsert: { userId: req.user.id, professionalId: req.professional._id }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const message = await Message.create({
            conversationId: conversation._id,
            senderId: req.user.id,
            text
        });

        res.status(201).json({
            conversationId: String(conversation._id),
            message
        });
    } catch (error) {
        next(error);
    }
});

export default router;