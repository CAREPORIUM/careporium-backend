// ---------------------------------------------------------------------------
// Ratings & Reviews service
// ---------------------------------------------------------------------------
// Business logic for shift feedback. Contains two related APIs:
//   1. Legacy generic ratings (/api/ratings/v1) — one overall score + comment.
//   2. B6 role-specific reviews (/api/reviews/v1) — workers rate facilities
//      with per-category scores; facilities rate workers and get worker stats.
// Both write to the ShiftRating collection. Reviews are only allowed on a
// completed shift, once per participant, within 14 days of completion.
// ---------------------------------------------------------------------------
import mongoose from "mongoose";
import Facility from "../models/facilityModel.js";
import Shift from "../models/shiftModel.js";
import ShiftRating from "../models/ShiftRating.js";
import Worker from "../models/workerModel.js";

// Helper: create an Error that also carries an HTTP status code so the global
// error handler (and controllers) can respond with the right code.
const createRatingError = (message, statusCode = 400) =>
    Object.assign(new Error(message), { statusCode });

// Determine the counterpart from the shift and authenticated account, never from client-supplied IDs.
const resolveShiftParticipants = async (shift, userId, role) => {
    const [worker, facility] = await Promise.all([
        Worker.findById(shift.assignedWorker).select("_id user").lean(),
        Facility.findById(shift.facility).select("_id user facilityName").lean()
    ]);

    if (!worker || !facility) {
        throw createRatingError("Shift participant profile not found", 404);
    }

    if (role === "worker" && worker.user.toString() === userId) {
        return {
            raterUser: worker.user,
            raterRole: "worker",
            raterProfileId: worker._id,
            ratedUser: facility.user,
            ratedRole: "facility",
            ratedProfileId: facility._id
        };
    }

    if (role === "facility" && facility.user.toString() === userId) {
        return {
            raterUser: facility.user,
            raterRole: "facility",
            raterProfileId: facility._id,
            ratedUser: worker.user,
            ratedRole: "worker",
            ratedProfileId: worker._id
        };
    }

    throw createRatingError("Only the worker assigned to this shift and its facility can rate", 403);
};

// A review may only be submitted within this many days of the shift completing.
const REVIEW_WINDOW_DAYS = 14;

// Validate and coerce a single 1-5 star score, or return null when it was omitted.
const parseStarRating = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        throw createRatingError("Ratings must be whole numbers from 1 to 5");
    }
    return parsed;
};

const normalizeComment = (commentValue) =>
    typeof commentValue === "string" ? commentValue.trim() : "";

// A completed shift may only be reviewed by its two participants, within the review window.
const assertReviewEligible = async (shiftId) => {
    if (!mongoose.isValidObjectId(shiftId)) {
        throw createRatingError("Invalid shift ID");
    }
    const shift = await Shift.findById(shiftId);
    if (!shift) throw createRatingError("Shift not found", 404);
    if (shift.status !== "completed" || !shift.workerCompletionConfirmed || !shift.facilityCompletionConfirmed) {
        throw createRatingError("Both parties must confirm the shift is complete before it can be rated", 409);
    }

    const completedAt = shift.completedAt ? new Date(shift.completedAt) : null;
    if (!completedAt) {
        throw createRatingError("Shift completion date is missing", 409);
    }
    const windowEnd = new Date(completedAt.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (Date.now() > windowEnd.getTime()) {
        throw createRatingError(`Reviews must be submitted within ${REVIEW_WINDOW_DAYS} days of shift completion`, 409);
    }
    return shift;
};

// POST /api/reviews/v1/facility/{shiftId} — a worker rates the facility after a shift.
export const createFacilityReview = async (userId, role, shiftId, body = {}) => {
    const rating = parseStarRating(body.rating);
    if (rating === null) {
        throw createRatingError("An overall rating is required");
    }
    const comment = normalizeComment(body.text);
    if (comment.length > 1000) {
        throw createRatingError("Review comment cannot exceed 1000 characters");
    }

    const shift = await assertReviewEligible(shiftId);
    const participants = await resolveShiftParticipants(shift, userId, role);
    if (participants.raterRole !== "worker") {
        throw createRatingError("Only the assigned worker can rate the facility", 403);
    }

    try {
        return await ShiftRating.create({
            shift: shift._id,
            ...participants,
            rating,
            workEnvironment: parseStarRating(body.workEnvironment),
            shiftAccuracy: parseStarRating(body.shiftAccuracy),
            staffSupport: parseStarRating(body.staffSupport),
            paymentExperience: parseStarRating(body.paymentExperience),
            comment
        });
    } catch (error) {
        if (error.code === 11000) {
            throw createRatingError("You have already reviewed this shift", 409);
        }
        throw error;
    }
};

// --- Legacy generic shift ratings (mounted at /api/ratings/v1) ---

// Submit a single overall rating (1-5) + optional comment for a completed
// shift. Either participant may rate the other; one rating per participant per
// shift (enforced by a unique index). Kept for backward compatibility.
export const createShiftRating = async (userId, role, shiftId, ratingValue, commentValue = "") => {
    if (!mongoose.isValidObjectId(shiftId)) {
        throw createRatingError("Invalid shift ID");
    }

    // Normalize request values and validate them before querying or writing rating data.
    const rating = Number(ratingValue);
    const comment = typeof commentValue === "string" ? commentValue.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw createRatingError("Rating must be a whole number from 1 to 5");
    }
    if (comment.length > 1000) {
        throw createRatingError("Rating comment cannot exceed 1000 characters");
    }

    // A rating is allowed only after both sides confirm the assigned shift is complete.
    const shift = await Shift.findById(shiftId);
    if (!shift) throw createRatingError("Shift not found", 404);
    if (shift.status !== "completed" || !shift.workerCompletionConfirmed || !shift.facilityCompletionConfirmed) {
        throw createRatingError("Both parties must confirm the shift is complete before it can be rated", 409);
    }

    const participants = await resolveShiftParticipants(shift, userId, role);

    try {
        return await ShiftRating.create({
            shift: shift._id,
            ...participants,
            rating,
            comment
        });
    } catch (error) {
        if (error.code === 11000) {
            throw createRatingError("You have already rated this shift", 409);
        }
        throw error;
    }
};

export const getShiftRatings = async (userId, role, shiftId) => {
    if (!mongoose.isValidObjectId(shiftId)) throw createRatingError("Invalid shift ID");
    const shift = await Shift.findById(shiftId).lean();
    if (!shift) throw createRatingError("Shift not found", 404);

    // Restrict shift-level feedback to the two people involved in that shift.
    await resolveShiftParticipants(shift, userId, role);
    return ShiftRating.find({ shift: shift._id })
        .select("raterRole ratedRole rating comment createdAt")
        .sort({ createdAt: 1 })
        .lean();
};

export const getProfileRatingSummary = async (role, profileId, pageValue = 1, limitValue = 10) => {
    if (!mongoose.isValidObjectId(profileId)) throw createRatingError("Invalid profile ID");
    if (role === "worker" && !(await Worker.exists({ _id: profileId }))) {
        throw createRatingError("Worker profile not found", 404);
    }
    if (role === "facility" && !(await Facility.exists({ _id: profileId }))) {
        throw createRatingError("Facility profile not found", 404);
    }

    // Clamp pagination so callers cannot request an unbounded result set.
    const page = Math.max(Number.parseInt(pageValue, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(limitValue, 10) || 10, 1), 50);
    const filter = { ratedRole: role, ratedProfileId: new mongoose.Types.ObjectId(profileId) };
    // Fetch score counts, one page of comments, and total count concurrently.
    const [aggregate, ratings, total] = await Promise.all([
        ShiftRating.aggregate([
            { $match: filter },
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]),
        ShiftRating.find(filter)
            .select("shift raterRole rating comment createdAt")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ShiftRating.countDocuments(filter)
    ]);
    // Add zero-count star levels so the frontend can always render all five bars.
    const counts = new Map(aggregate.map(({ _id, count }) => [_id, count]));
    const distribution = [5, 4, 3, 2, 1].map((rating) => {
        const count = counts.get(rating) || 0;
        return { rating, count, percentage: total ? Math.round((count / total) * 100) : 0 };
    });
    // Weight each star value by its number of ratings to calculate the mean.
    const average = total
        ? aggregate.reduce((sum, item) => sum + item._id * item.count, 0) / total
        : 0;

    return {
        summary: { average: Number(average.toFixed(1)), total, distribution },
        ratings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
};

// Compute a worker's public stats to accompany their profile.
const buildWorkerStats = async (workerProfileId) => {
    const [summaryAggregate, completedShifts, noShows90Days] = await Promise.all([
        ShiftRating.aggregate([
            { $match: { ratedRole: "worker", ratedProfileId: new mongoose.Types.ObjectId(workerProfileId) } },
            { $group: { _id: null, total: { $sum: 1 }, sum: { $sum: "$rating" } } }
        ]),
        Shift.countDocuments({ assignedWorker: workerProfileId, status: "completed" }),
        // The platform does not yet record no-shows, so the count is a placeholder of 0.
        Promise.resolve(0)
    ]);

    const ratingCount = summaryAggregate[0]?.total || 0;
    const rating = ratingCount ? Number((summaryAggregate[0].sum / ratingCount).toFixed(1)) : 0;
    // Attendance is derived from completed shifts as a proxy until attendance is tracked.
    const attendanceRate = completedShifts ? 100 : 0;

    return { rating, completedShifts, attendanceRate, noShows90Days };
};

// POST /api/reviews/v1/worker/{shiftId}/{workerId} — the facility rates a worker after a shift.
export const createWorkerReview = async (userId, role, shiftId, workerId, body = {}) => {
    const rating = parseStarRating(body.rating);
    if (rating === null) {
        throw createRatingError("An overall rating is required");
    }
    const comment = normalizeComment(body.text);
    if (comment.length > 1000) {
        throw createRatingError("Review comment cannot exceed 1000 characters");
    }

    const shift = await assertReviewEligible(shiftId);
    const participants = await resolveShiftParticipants(shift, userId, role);
    if (participants.raterRole !== "facility") {
        throw createRatingError("Only the shift's facility can rate the worker", 403);
    }
    // Guard against a mismatched workerId in the path; the shift is the source of truth.
    if (workerId && String(participants.ratedProfileId) !== String(workerId)) {
        throw createRatingError("This worker is not assigned to the shift", 400);
    }

    let review;
    try {
        review = await ShiftRating.create({
            shift: shift._id,
            ...participants,
            rating,
            comment
        });
    } catch (error) {
        if (error.code === 11000) {
            throw createRatingError("You have already reviewed this shift", 409);
        }
        throw error;
    }

    // The worker's stats are returned alongside the freshly created review.
    const workerStats = await buildWorkerStats(participants.ratedProfileId);
    return { review, workerStats };
};

// Reduce a worker's full name to "First L." for public display.
const toFirstInitial = (fullName = "") => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

// Average a set of optional category scores, ignoring blanks.
const averageCategory = (rows, field) => {
    const values = rows.map((r) => r[field]).filter((v) => typeof v === "number");
    if (values.length === 0) return 0;
    return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
};

// GET /api/reviews/v1/facility/{facilityId} — the facility reviews page for logged-in workers.
export const getFacilityReviewPage = async (facilityId) => {
    if (!mongoose.isValidObjectId(facilityId)) throw createRatingError("Invalid facility ID");
    const facility = await Facility.findById(facilityId).select("facilityName location").lean();
    if (!facility) throw createRatingError("Facility not found", 404);

    const filter = { ratedRole: "facility", ratedProfileId: new mongoose.Types.ObjectId(facilityId) };
    const reviews = await ShiftRating.find(filter)
        .select("raterProfileId rating workEnvironment shiftAccuracy staffSupport paymentExperience comment createdAt")
        .sort({ createdAt: -1 })
        .lean();

    // Workers are the only raters on the facility page, so resolve their profiles by id.
    const raterIds = [...new Set(reviews.map((r) => String(r.raterProfileId)))];
    const workers = await Worker.find({ _id: { $in: raterIds } })
        .select("fullName profession")
        .lean();
    const workerById = new Map(workers.map((w) => [String(w._id), w]));

    const reviewCount = reviews.length;
    const rating = reviewCount
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
        : 0;

    return {
        facilityName: facility.facilityName,
        location: facility.location,
        rating,
        reviewCount,
        workEnvironment: averageCategory(reviews, "workEnvironment"),
        shiftAccuracy: averageCategory(reviews, "shiftAccuracy"),
        staffSupport: averageCategory(reviews, "staffSupport"),
        paymentExperience: averageCategory(reviews, "paymentExperience"),
        reviews: reviews.map((review) => {
            const worker = workerById.get(String(review.raterProfileId));
            return {
                workerName: toFirstInitial(worker?.fullName),
                profession: worker?.profession || "",
                rating: review.rating,
                date: new Date(review.createdAt).toISOString().slice(0, 10),
                text: review.comment
            };
        })
    };
};