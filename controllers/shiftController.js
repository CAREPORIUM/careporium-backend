// ---------------------------------------------------------------------------
// Shift controllers
// ---------------------------------------------------------------------------
// Thin HTTP layer for shift endpoints. Each handler pulls data off the request
// (req.user, req.params, req.body), calls the matching shiftService function,
// and returns a JSON response. Business logic/validation lives in shiftService.
// ---------------------------------------------------------------------------
import {
    createShift,
    getShifts,
    getShiftById,
    updateShift,
    deleteShift,
    confirmShiftCompletion
} from "../services/shiftService.js";

// POST /api/shifts/v1/ — create a new shift (facility-only, enforced in the route).
const createShiftController = async (req, res) => {
    try {
        const shift = await createShift(req.user.id, req.body);

        res.status(201).json({
            message: "Shift created successfully",
            data: shift
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// GET /api/shifts/v1/ — list all currently open shifts.
const getShiftsController = async (req, res) => {
    try {
        const shifts = await getShifts();

        res.status(200).json({
            message: "Shifts fetched successfully",
            data: shifts
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// GET /api/shifts/v1/:id — fetch a single shift by id.
const getShiftByIdController = async (req, res) => {
    try {
        const shift = await getShiftById(req.params.id);

        res.status(200).json({
            message: "Shift fetched successfully",
            data: shift
        });
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
};
// PUT /api/shifts/v1/:id — update an existing shift (facility-only).
const updateShiftController = async (req, res) => {
    try {
        const shift = await updateShift(
            req.user.id,
            req.params.id,
            req.body
        );

        res.status(200).json({
            message: "Shift updated successfully",
            data: shift
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};
// DELETE /api/shifts/v1/:id — delete a shift (facility-only).
const deleteShiftController = async (req, res) => {
    try {
        await deleteShift(
            req.user.id,
            req.params.id
        );

        res.status(200).json({
            message: "Shift deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// POST /api/shifts/v1/:id/complete — a participant confirms shift completion.
// The response message reflects whether both parties have now confirmed (the
// point at which the shift becomes reviewable).
const confirmShiftCompletionController = async (req, res) => {
    try {
        const shift = await confirmShiftCompletion(req.user.id, req.user.role, req.params.id);
        res.status(200).json({
            message: shift.status === "completed"
                ? "Both parties confirmed completion; the shift can now be rated"
                : "Your completion confirmation was recorded; awaiting the other participant",
            data: shift
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};

export {
    createShiftController,
    getShiftsController,
    getShiftByIdController,
    updateShiftController,
    deleteShiftController,
    confirmShiftCompletionController
};