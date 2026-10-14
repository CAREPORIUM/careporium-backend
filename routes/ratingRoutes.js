import express from "express";
import {
    createShiftRatingController,
    getFacilityRatingSummaryController,
    getShiftRatingsController,
    getWorkerRatingSummaryController
} from "../controllers/ratingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// ---------------------------------------------------------------------------
// Legacy generic shift ratings — mounted at /api/ratings/v1 (see index.js)
// ---------------------------------------------------------------------------
// These endpoints capture a single overall score + optional comment for a
// completed shift. The richer, role-specific B6 review endpoints live in
// reviewRoutes.js under /api/reviews/v1. Both write to the same ShiftRating
// collection; these are kept for backward compatibility.
// ---------------------------------------------------------------------------
const router = express.Router();

// Authenticated participants can rate the other side once a shift is confirmed complete.
router.post("/shifts/:shiftId", authMiddleware, createShiftRatingController);

// Only the worker and facility involved in a shift may see ratings for that shift.
router.get("/shifts/:shiftId", authMiddleware, getShiftRatingsController);

// Public summaries let profile screens show averages and rating distributions.
router.get("/workers/:workerId", getWorkerRatingSummaryController);
router.get("/facilities/:facilityId", getFacilityRatingSummaryController);

export default router;