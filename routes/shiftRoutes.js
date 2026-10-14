import express from "express";
import {
    createShiftController,
    getShiftsController,
    getShiftByIdController,
    updateShiftController,
    deleteShiftController,
    confirmShiftCompletionController
} from "../controllers/shiftController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validateShift } from "../middleware/shiftValidator.js";

const router = express.Router();

// --- Public shift browsing (no authentication required) ---

// GET /api/shifts/v1/ — list all currently open shifts.
router.get(
    "/",
    getShiftsController
);

// GET /api/shifts/v1/:id — fetch a single shift by its id.
router.get(
    "/:id",
    getShiftByIdController
);

// --- Facility-only shift management (login + facility role required) ---

// PUT /api/shifts/v1/:id — update an existing shift.
router.put(
    "/:id",
    authMiddleware,
    requireRole("facility"),
    updateShiftController
);

// DELETE /api/shifts/v1/:id — delete a shift.
router.delete(
    "/:id",
    authMiddleware,
    requireRole("facility"),
    deleteShiftController
);

// POST /api/shifts/v1/ — create a new shift (validated by validateShift).
router.post(
    "/",
    authMiddleware,
    requireRole("facility"),
    validateShift,
    createShiftController
);

// --- Shift completion (either participant may confirm) ---

// POST /api/shifts/v1/:id/complete — a participant confirms the shift is done.
// When BOTH the worker and facility have confirmed, the shift becomes
// "completed" and eligible for reviews.
router.post(
    "/:id/complete",
    authMiddleware,
    confirmShiftCompletionController
);


export default router;