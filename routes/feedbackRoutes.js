import express from "express";
import feedbackController from "../controllers/feedbackController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
    "/:shiftId",
    authMiddleware,
    requireRole("worker"),
    feedbackController.submitFeedback
);

export default router;
