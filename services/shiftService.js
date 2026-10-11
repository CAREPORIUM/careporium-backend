import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";
import Attendance from "../models/attendanceModel.js"

// create a new shift under a facility's profile
const createShift = async (userId, shiftData) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    const shift = await Shift.create({

    facility: facility._id,
    profession: shiftData.profession,
    specialty: shiftData.specialty,
    shiftDate: shiftData.shiftDate,
    shiftType: shiftData.shiftType,
    startTime: shiftData.startTime,
    endTime: shiftData.endTime,
    professionalsNeeded: shiftData.professionalsNeeded,
    minimumExperience: shiftData.minimumExperience,
    location: shiftData.location,
    responsibilities: shiftData.responsibilities,
    reqCredentials: shiftData.reqCredentials,
    arrivalInstructions: shiftData.arrivalInstructions,
    payRate: shiftData.payRate,
    isUrgent: shiftData.isUrgent,
    });

    return shift;
};

// get all available shifts
const getAllShifts = async () => {

    const shifts = await Shift.find({status: "open"})
    .populate({
        path: "facility", 
        select: "facilityName facilityType location",
    });

    return shifts;
};


//get a single shift by its ID
const getShiftById = async (userId, role, shiftId) => {

    //find the shift
    const shift = await Shift.findById(shiftId)
        .populate({
            path: "facility",
            select: "facilityName facilityType location",
        });

    if (!shift) {
        throw new Error("Shift not found");
    }

    //facility can only view shifts belonging to their facility
    if (role === "facility") {

        const facility = await Facility.findOne({
            user: userId
        });

        if (!facility) {
            throw new Error("Facility not found for this user");
        }

        if (
            shift.facility._id.toString() !==
            facility._id.toString()
        ) {
            throw new Error(
                "You are not authorized to view this shift"
            );
        }
        //facility can see assigned workers
        await shift.populate({
            path: "assignedWorkers",
            select: "fullName profession specialty yearsOfExperience",
        });
        return shift;
    }
    //admin can view the shift and assigned workers
    if (role === "admin") {

        await shift.populate({
            path: "assignedWorkers",
            select: "fullName profession specialty yearsOfExperience",
        });

        return shift;
    }
    //worker can view the shift without seeing assigned workers
    if (role === "worker") {

        //remove sensitive fields from the response
        const shiftData = shift.toObject();

        delete shiftData.assignedWorkers;
        delete shiftData.attendanceQrToken;

        return shiftData;
    }
    throw new Error("You are not authorized to view this shift");
};

// get all shifts belonging to a facility by the facility's user ID
const getShiftsForFacility = async (userId) => {
    // find the facility associated with the user
    const facility = await Facility.findOne({
        user: userId
    })

    if(!facility){
        throw new Error("Facility not found for this user")
    }

    const shifts = await Shift.find({
        facility: facility._id,
        }).populate({
            path: 'assignedWorkers',
            select: 'fullname profession specialty yearsOfExperience',
        })

        return shifts;
}

// update a shift by facility
const updateShift = async (userId, shiftId, shiftData) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user")
    }

    // find the shift belonging to the facility
    const shift = await Shift.findOne({ 
        _id: shiftId,
        facility: facility._id
    })

    if (!shift) {
        throw new Error("Shift not found or you are not authorized to update this shift");
    }

    // don't allow professionals needed to be changed
    // once all required workers have been assigned

    if (
        shiftData.professionalsNeeded !== undefined &&
        shift.assignedWorkers.length >= shift.professionalsNeeded
    ) {

        throw new Error( "Professionals needed cannot be changed because all required workers have already been assigned.")
    }

    // don't allow professionals needed to be reduced
    // below the number of workers already assigned

   if (
  shiftData.professionalsNeeded !== undefined &&
  shift.assignedWorkers.length >= shift.professionalsNeeded
) {
  throw new Error(
    "Professionals needed cannot be changed because all required workers have already been assigned."
  );
}

if (
  shiftData.professionalsNeeded !== undefined &&
  shiftData.professionalsNeeded < shift.assignedWorkers.length
) {
  throw new Error(
    "Professionals needed cannot be less than the number of workers already assigned."
  );
}
    // update the shift fields with the provided data
    const allowedFields = [
        "profession",
        "specialty",
        "shiftDate",
        "shiftType",
        "startTime",
        "endTime",
        "professionalsNeeded",
        "minimumExperience",
        "location",
        "responsibilities",
        "reqCredentials",
        "arrivalInstructions",
        "payRate",
        "isUrgent"
    ];

    allowedFields.forEach((field) => {
        if (shiftData[field] !== undefined) {
            shift[field] = shiftData[field];
        }
    })

    // check if the shift still needs more workers
    if (shift.assignedWorkers.length < shift.professionalsNeeded){
        shift.status = 'open'
    }

    if (shift.assignedWorkers.length >= shift.professionalsNeeded) {
        shift.status = 'filled'
    }

    await shift.save();

    return shift;
};

// close a shift by facility
const closeShift= async (userId, shiftId) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    const shift = await Shift.findOne({_id: shiftId, facility: facility._id });

    if (!shift) {
        throw new Error("Shift not found or you are not authorized to close this shift");
    }

    shift.status = 'closed';
    await shift.save();

    return shift;
};

// complete a shift by facility
const completeShift = async (userId, shiftId) => {

    // find the facility belonging to the logged-in user
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    // find the shift belonging to the facility
    const shift = await Shift.findOne({
        _id: shiftId,
        facility: facility._id
    });

    if (!shift) {
        throw new Error(
            "Shift not found or you are not authorized to complete this shift"
        );
    }

    // the shift must be filled before it can be completed
    if (shift.status !== "filled") {
        throw new Error(
            "Only a filled shift can be completed"
        );
    }

    // make sure there are assigned workers
    if (shift.assignedWorkers.length === 0) {
        throw new Error(
            "This shift has no assigned workers"
        );
    }

    // find all attendance records for the assigned workers
    const attendanceRecords = await Attendance.find({
        shift: shift._id,
        worker: { $in: shift.assignedWorkers }
    });

    // make sure every assigned worker has an attendance record
    if (
        attendanceRecords.length !==
        shift.assignedWorkers.length
    ) {
        throw new Error(
            "All assigned workers must have attendance records before the shift can be completed"
        );
    }
    // make sure every assigned worker has clocked out
    const workerStillWorking = attendanceRecords.some(
        (attendance) => !attendance.clockOutTime
    );

    if (workerStillWorking) {
        throw new Error(
            "All assigned workers must clock out before the shift can be completed"
        );
    }
    // mark the shift as completed
    shift.status = "completed";

    await shift.save();

    return shift;
};

// delete a shift by facility
const deleteShift = async (userId, shiftId) => {
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    const shift = await Shift.findOne({_id: shiftId, facility: facility._id });

    if (!shift) {
        throw new Error("Shift not found or you are not authorized to delete this shift");
    }

    await shift.deleteOne();

    return shift;
};

export default { createShift, getAllShifts, getShiftById, getShiftsForFacility, updateShift, deleteShift, closeShift, completeShift }