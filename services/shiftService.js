import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";

const createShift = async (userId, shiftData) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

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

const getShifts = async () => {
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

    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to update this shift");
    }

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

    if (shift.facility.toString() !== facility._id.toString()) {
        throw new Error("You are not authorized to delete this shift");
    }

    await shift.deleteOne();

    return shift;
};
export { createShift, getShifts, getShiftById,updateShift, deleteShift };