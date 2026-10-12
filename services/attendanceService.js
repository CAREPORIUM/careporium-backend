import { createNotification } from "./notificationService.js";
import QRCode from "qrcode"
import Attendance from "../models/attendanceModel.js"
import Shift from "../models/shiftModel.js"
import Worker from "../models/workerModel.js"
import Facility from "../models/facilityModel.js"

// generate a secure QR token for a shift
 const getShiftQrCode = async(userId, shiftId) =>{

    //find the shift 
    const shift = await Shift.findById(shiftId)

    if (!shift){
        throw new Error("Shift not found")
    }
    // check that the shift has been filled
    if (shift.status !== "filled") {
        throw new Error(
            "The attendance QR code can only be generated for a filled shift."
        );
    }
    //check that the logged-in user owns the facility
    const facility = await Facility.findOne({
                _id: shift.facility,
                user: userId
            })
    if (!facility) {
        throw new Error(
            "You are not authorized to access this shift's QR code."
        );
    }
    //make sure the shift has an attendance QR token
    if (!shift.attendanceQrToken) {
        throw new Error(
            "Attendance QR token has not been generated for this shift."
        );
    }
    //convert the attendance token into a QR code
    const qrCode = await QRCode.toDataURL(
        shift.attendanceQrToken
    );
    return {
        shiftId: shift._id,
        qrCode
    };
};

// worker clocks in using the QR token generated
const clockIn = async(userId, qrToken) => {
    const worker = await Worker.findOne({user: userId})

    if(!worker){
    throw new Error("Invalid attendance QR code")
    }

    const shift = await Shift.findOne({
    attendanceQrToken: qrToken
    });
    //check that the worker was assigned to this shift
    const workerAssigned = shift.assignedWorkers.some(
        (workerId) => workerId.toString() === worker._id.toString()
    );
    if (!workerAssigned) {
        throw new Error(
            "You are not assigned to this shift"
        );
    }
    //check that the shift is filled
    if (shift.status !== "filled") {
        throw new Error(
            "Attendance can only be recorded for a filled shift"
        );
    }
    //check if the worker already has an attendance record
    const existingAttendance = await Attendance.findOne({
        worker: worker._id,
        shift: shift._id
    });

    if (existingAttendance) {
        throw new Error(
            "You have already clocked in for this shift"
        );
    }

    //create the attendance record
    const attendance = await Attendance.create({
        worker: worker._id,
        shift: shift._id,
        clockInTime: new Date(),
        status: "present"
    })

    return attendance
}

// worker clocks out using the QR token generated
const clockOut = async(userId, qrToken) =>{
    const worker = await Worker.findOne({
        user: userId
    })
    if(!worker){
        throw new Error("Worker not found")
    }

    const shift = await Shift.findOne({
        attendanceQrToken: qrToken
    })

    if(!shift) {
        throw new Error("Invalid attendance QR code")
    }

    const attendance = await Attendance.findOne({
        worker: worker._id,
        shift: shift._id
    })

    if(!attendance){
        throw new Error("You must clock in before you can clock out")
    }

    if(attendance.clockOutTime){
        throw new Error("You have already clocked out for this shift")
    }

    // save clock out time
    attendance.clockOutTime = new Date()

    //calculate total hours worked
    const millisecondsWorked = attendance.clockOutTime - attendance.clockInTime
    attendance.totalHoursWorked = millisecondsWorked / (1000 * 60 * 60);
await attendance.save();

// Notify the facility when all assigned workers have clocked out.
const facility = await Facility.findById(shift.facility);

if (facility && shift.assignedWorkers.length > 0) {
    const facilityShifts = await Shift.find({
        facility: facility._id,
        status: "filled",
        assignedWorkers: { $exists: true, $ne: [] },
    }).select("_id assignedWorkers");

    const attendanceRecords = await Attendance.find({
        shift: { $in: facilityShifts.map((item) => item._id) },
        clockOutTime: { $exists: true, $ne: null },
    }).select("shift worker clockOutTime");

    const readyShifts = facilityShifts.filter((item) =>
        item.assignedWorkers.length > 0 &&
        item.assignedWorkers.every((workerId) =>
            attendanceRecords.some(
                (record) =>
                    record.shift.toString() === item._id.toString() &&
                    record.worker.toString() === workerId.toString()
            )
        )
    );

    const pendingCount = readyShifts.length;
    const shiftReady = readyShifts.some(
        (item) => item._id.toString() === shift._id.toString()
    );

    if (shiftReady) {
        await createNotification({
            recipient: facility.user,
            type: "SHIFT_COMPLETION_CONFIRMATION_REQUIRED",
            title: "Shift completion confirmation required",
            message: `You have ${pendingCount} shift${pendingCount === 1 ? "" : "s"} awaiting completion review. Confirm attendance and complete the shift${pendingCount === 1 ? "" : "s"} so payment can proceed.`,
            resourceType: "Shift",
            resourceId: shift._id,
        });
    }
}

return attendance;}

export { getShiftQrCode, clockIn, clockOut}

