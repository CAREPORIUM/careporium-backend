import express from "express";
import {
    createFacilityReviewController,
    createWorkerReviewController,
    getFacilityReviewPageController
} from "../controllers/ratingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

// ---------------------------------------------------------------------------
// B6 Reviews API — mounted at /api/reviews/v1 (see index.js)
// ---------------------------------------------------------------------------
// These endpoints are role-specific and shift-scoped. Every route requires an
// authenticated user (authMiddleware); the specific role check (worker vs
// facility) is enforced inside the service layer so a single source of truth
// decides who may review whom.
// ---------------------------------------------------------------------------
const router = express.Router();

// POST /facility/:shiftId — a worker rates the facility after a completed shift.
// Body: { rating, workEnvironment, shiftAccuracy, staffSupport, paymentExperience, text }
router.post("/facility/:shiftId", authMiddleware, createFacilityReviewController);

// GET /facility/:facilityId — the facility reviews page for logged-in workers.
// Restricted to the "worker" role per the B6 spec ("Who: Logged-in workers").
router.get("/facility/:facilityId", authMiddleware, requireRole("worker"), getFacilityReviewPageController);

// POST /worker/:shiftId/:workerId — the shift's facility rates the worker.
// Body: { rating, text }
router.post("/worker/:shiftId/:workerId", authMiddleware, createWorkerReviewController);

export default router;
