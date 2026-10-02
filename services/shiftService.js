import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";

const createShift = async (userId, shiftData) => {
    // Find the facility profile linked to the authenticated user.
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    // Only allow fields that a facility is permitted to set when creating a shift.
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

    const filteredData = {};

    // Ignore any fields that are not part of the allowed shift data.
    for (const field of allowedFields) {
        if (shiftData[field] !== undefined) {
            filteredData[field] = shiftData[field];
        }
    }

    // Use the facility found from the authenticated user instead of trusting the client.
    const shift = await Shift.create({
        ...filteredData,
        facility: facility._id
    });

    return shift;
};

const getShifts = async () => {
    // Only return open shifts that are scheduled for today or a future date.
    const shifts = await Shift.find({
        status: "open",
        date: { $gte: new Date() }
    }).sort({
        date: 1
    });

    return shifts;
};

const getShiftById = async (shiftId) => {
    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error("Shift not found");
    }

    return shift;
};

const updateShift = async (userId, shiftId, shiftData) => {
    // Find the facility profile linked to the authenticated user.
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

    // Make sure the authenticated facility owns the shift before updating it.
    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to update this shift");
    }

    // Only allow fields that a facility is permitted to update.
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

const deleteShift = async (userId, shiftId) => {
    // Find the facility profile linked to the authenticated user.
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

    // Prevent a facility from deleting another facility's shift.
    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to delete this shift");
    }

    await shift.deleteOne();

    return shift;
};

export { createShift, getShifts, getShiftById, updateShift, deleteShift };
