import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";
import Worker from "../models/workerModel.js";

// ---------------------------------------------------------------------------
// Shift service
// ---------------------------------------------------------------------------
// Business logic for shifts: create/list/get/update/delete, plus the two-party
// completion flow. Only a shift's owning facility may create/update/delete it;
// completion is confirmed independently by the facility and the assigned
// worker, and the shift only becomes "completed" once BOTH confirm (which is
// what makes it eligible for reviews in the ratings/reviews feature).
// ---------------------------------------------------------------------------

// Helper: create an Error that also carries an HTTP status code so the global
// error handler can respond with the right code.
const createServiceError = (message, statusCode = 400) =>
    Object.assign(new Error(message), { statusCode });

// Create a shift for the signed-in facility. Only an allow-list of fields from
// the request body is copied, so clients cannot set internal fields directly.
const createShift = async (userId, shiftData) => {
    // Resolve the caller's facility profile; every shift belongs to a facility.
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    // Fields a client is permitted to set when creating a shift.
    const allowedFields = [
        "role",
        "specialty",
        "workType",
        "description",
        "requirements",
        "date",
        "startTime",
        "endTime",
        "shiftType",
        "location",
        "payRate",
        "isUrgent"
    ];

    // Copy only the allow-listed fields that were actually provided.
    const filteredData = {};

    for (const field of allowedFields) {
        if (shiftData[field] !== undefined) {
            filteredData[field] = shiftData[field];
        }
    }

    const shift = await Shift.create({
        ...filteredData,
        facility: facility._id
    });

    return shift;
};

// List all shifts that are still open and haven't started yet, soonest first.
const getShifts = async () => {
    const shifts = await Shift.find({
        status: "open",
        date: { $gte: new Date() }
    }).sort({
        date: 1
    });

    return shifts;
};
// Fetch a single shift by id.
const getShiftById = async (shiftId) => {
    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error("Shift not found");
    }

    return shift;
};
// Update a shift. Only the owning facility may update it, and only an
// allow-list of fields may change (internal fields like status are protected).
const updateShift = async (userId, shiftId, shiftData) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error("Shift not found");
    }

    // Ownership check: a facility can only update its own shifts.
    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to update this shift");
    }

    // Fields a client is permitted to update.
    const allowedFields = [
        "role",
        "specialty",
        "workType",
        "description",
        "requirements",
        "date",
        "startTime",
        "endTime",
        "shiftType",
        "location",
        "payRate",
        "isUrgent"
    ];

    for (const field of allowedFields) {
        if (shiftData[field] !== undefined) {
            shift[field] = shiftData[field];
        }
    }

    await shift.save();

    return shift;
};
// Delete a shift. Only the owning facility may delete it.
const deleteShift = async (userId, shiftId) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error("Shift not found");
    }

    // Ownership check before deleting.
    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to delete this shift");
    }

    await shift.deleteOne();

    return shift;
};

// Record one participant's confirmation that the shift is complete. When both
// the facility and the assigned worker have confirmed, the shift is marked
// "completed" (with a completedAt timestamp) so it becomes eligible for reviews.
const confirmShiftCompletion = async (userId, role, shiftId) => {
    const shift = await Shift.findById(shiftId);
    if (!shift) throw createServiceError("Shift not found", 404);

    // A shift must have an assigned worker before it can be completed.
    if (!shift.assignedWorker) {
        throw createServiceError("This shift does not have an assigned worker", 409);
    }

    // Idempotent: if already completed, just return it.
    if (shift.status === "completed") return shift;

    // Completion can only be recorded while the shift is in progress.
    if (shift.status !== "in_progress") {
        throw createServiceError("Only in-progress shifts can be marked complete", 409);
    }

    if (role === "facility") {
        // Verify the caller owns this shift before recording their confirmation.
        const facility = await Facility.findOne({ user: userId }).select("_id");
        if (!facility || shift.facility.toString() !== facility._id.toString()) {
            throw createServiceError("Only the shift's facility can confirm completion", 403);
        }
        await Shift.updateOne({ _id: shift._id }, { $set: { facilityCompletionConfirmed: true } });
    } else if (role === "worker") {
        // Verify the caller is the worker assigned to this shift.
        const worker = await Worker.findOne({ user: userId }).select("_id");
        if (!worker || shift.assignedWorker.toString() !== worker._id.toString()) {
            throw createServiceError("Only the assigned worker can confirm completion", 403);
        }
        await Shift.updateOne({ _id: shift._id }, { $set: { workerCompletionConfirmed: true } });
    } else {
        throw createServiceError("Only workers and facilities can confirm completion", 403);
    }

    // Mark complete only after both participants independently confirm the work.
    await Shift.updateOne(
        {
            _id: shift._id,
            workerCompletionConfirmed: true,
            facilityCompletionConfirmed: true
        },
        { $set: { status: "completed", completedAt: new Date() } }
    );

    // Return the freshly-updated shift so the caller sees the new status.
    return Shift.findById(shift._id);
};

export {
    createShift,
    getShifts,
    getShiftById,
    updateShift,
    deleteShift,
    confirmShiftCompletion
};