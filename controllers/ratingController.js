// ---------------------------------------------------------------------------
// Ratings & Reviews controllers
// ---------------------------------------------------------------------------
// Controllers are a thin HTTP layer: they read data off the request, call the
// matching service function, and shape the JSON response. All business rules
// (eligibility, roles, validation) live in ratingService.js. Each response
// wraps the result in a `data` field so the API has a consistent envelope.
// ---------------------------------------------------------------------------
import {
    createShiftRating,
    createFacilityReview,
    createWorkerReview,
    getFacilityReviewPage,
    getProfileRatingSummary,
    getShiftRatings
} from "../services/ratingService.js";

// POST /api/reviews/v1/facility/:shiftId — worker rates the facility after a shift.
// Requires a valid JWT; the service confirms the caller is the shift's worker.
export const createFacilityReviewController = async (req, res, next) => {
    try {
        const review = await createFacilityReview(
            req.user.id,
            req.user.role,
            req.params.shiftId,
            req.body
        );
        res.status(201).json({ data: review });
    } catch (error) {
        next(error);
    }
};

// POST /api/reviews/v1/worker/:shiftId/:workerId — facility rates the worker after a shift.
// Returns the created review plus the worker's public stats.
export const createWorkerReviewController = async (req, res, next) => {
    try {
        const result = await createWorkerReview(
            req.user.id,
            req.user.role,
            req.params.shiftId,
            req.params.workerId,
            req.body
        );
        res.status(201).json({ data: result });
    } catch (error) {
        next(error);
    }
};

// GET /api/reviews/v1/facility/:facilityId — the facility reviews page.
// Available to any logged-in user; returns facility info, category averages
// and masked worker reviews.
export const getFacilityReviewPageController = async (req, res, next) => {
    try {
        const result = await getFacilityReviewPage(req.params.facilityId);
        res.json({ data: result });
    } catch (error) {
        next(error);
    }
};

// --- Legacy generic rating endpoints (mounted at /api/ratings/v1) ---

// POST /shifts/:shiftId — submit a single overall rating for a completed shift.
export const createShiftRatingController = async (req, res, next) => {
    try {
        const rating = await createShiftRating(
            req.user.id,
            req.user.role,
            req.params.shiftId,
            req.body.rating,
            req.body.comment
        );
        res.status(201).json({ message: "Rating submitted", data: rating });
    } catch (error) {
        next(error);
    }
};

// GET /shifts/:shiftId — list the ratings for a specific shift (participants only).
export const getShiftRatingsController = async (req, res, next) => {
    try {
        const ratings = await getShiftRatings(req.user.id, req.user.role, req.params.shiftId);
        res.json({ data: ratings });
    } catch (error) {
        next(error);
    }
};

// GET /workers/:workerId — public rating summary/distribution for a worker profile.
export const getWorkerRatingSummaryController = async (req, res, next) => {
    try {
        // The route fixes the recipient role; the client only supplies the worker profile ID.
        const result = await getProfileRatingSummary(
            "worker",
            req.params.workerId,
            req.query.page,
            req.query.limit
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// GET /facilities/:facilityId — public rating summary/distribution for a facility profile.
export const getFacilityRatingSummaryController = async (req, res, next) => {
    try {
        // The route fixes the recipient role; the client only supplies the facility profile ID.
        const result = await getProfileRatingSummary(
            "facility",
            req.params.facilityId,
            req.query.page,
            req.query.limit
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
};