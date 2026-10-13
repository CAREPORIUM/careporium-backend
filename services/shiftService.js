import mongoose from "mongoose";
import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";
import Attendance from "../models/attendanceModel.js";
import Payment from "../models/paymentModel.js";
import paymentService from "./paymentService.js";

// create a new shift under a facility's profile
const createShift = async (userId, shiftData, clientPlatform = "web") => {

    // mock payments must never be used in production
    const paymentProvider = process.env.PAYMENT_PROVIDER || "mock";

    if (
        process.env.NODE_ENV === "production" &&
        paymentProvider === "mock"
    ) {
        throw new Error(
            "Mock payments are disabled in production"
        );
    }

    // validate the client platform
    if (!["web", "mobile"].includes(clientPlatform)) {
        throw new Error("Invalid client platform");
    }

    // find the facility belonging to the logged-in user
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    // create the shift as unpublished until payment is verified
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
        status: "pending_payment"
    });

    try {

        // create a pending payment and initiate funding
        const payment = await paymentService.createPendingPayment({
            shift,
            facility,
            payRate: shift.payRate,
            professionalsNeeded: shift.professionalsNeeded,
            clientPlatform
        });

        // simulate payment only while developing locally
        if (paymentProvider === "mock") {

            const fundedPayment =
                await paymentService.simulateMockPayment(payment._id);

            // return the funded payment and updated shift
            return {
                shift: await Shift.findById(shift._id),
                payment: fundedPayment
            };
        }

        // keep the shift unpublished until HarrenaPay confirms funding
        return {
            shift,
            payment
        };

    } catch (error) {

        // preserve the unpublished shift so payment can be retried
        error.shiftId = shift._id;

        throw error;
    }
};

// get all available shifts
const getAllShifts = async () => {

    const shifts = await Shift.find({
        status: "open"
    }).populate({
        path: "facility",
        select: "facilityName facilityType location"
    });

    return shifts;
};

// get a single shift by its ID
const getShiftById = async (userId, role, shiftId) => {

    // find the shift
    const shift = await Shift.findById(shiftId)
        .populate({
            path: "facility",
            select: "facilityName facilityType location"
        });

    if (!shift) {
        throw new Error("Shift not found");
    }

    // facility can only view shifts belonging to their facility
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

        // facility can see assigned workers
        await shift.populate({
            path: "assignedWorkers",
            select: "fullName profession specialty yearsOfExperience"
        });

        return shift;
    }

    // admin can view the shift and assigned workers
    if (role === "admin") {

        await shift.populate({
            path: "assignedWorkers",
            select: "fullName profession specialty yearsOfExperience"
        });

        return shift;
    }

    // worker can view the shift without seeing assigned workers
    if (role === "worker") {

        // remove sensitive fields from the response
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
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    const shifts = await Shift.find({
        facility: facility._id
    }).populate({
        path: "assignedWorkers",
        select: "fullName profession specialty yearsOfExperience"
    });

    return shifts;
};

// update a shift by facility
const updateShift = async (userId, shiftId, shiftData) => {

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
            "Shift not found or you are not authorized to update this shift"
        );
    }

    // don't allow unpublished shifts to be edited through the regular update route
    if (shift.status === "pending_payment") {
        throw new Error(
            "This shift cannot be updated until payment has been confirmed"
        );
    }

    // don't allow completed or closed shifts to be edited
    if (["completed", "closed"].includes(shift.status)) {
        throw new Error(
            "Completed or closed shifts cannot be updated"
        );
    }

    // don't allow professionals needed to be changed
    // once all required workers have been assigned
    if (
        shiftData.professionalsNeeded !== undefined &&
        shift.assignedWorkers.length >= shift.professionalsNeeded
    ) {
        throw new Error(
            "Professionals needed cannot be changed because all required workers have already been assigned."
        );
    }

    // don't allow professionals needed to be reduced
    // below the number of workers already assigned
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
    });

    // check if the shift still needs more workers
    if (shift.assignedWorkers.length < shift.professionalsNeeded) {
        shift.status = "open";
    }

    if (shift.assignedWorkers.length >= shift.professionalsNeeded) {
        shift.status = "filled";
    }

    await shift.save();

    return shift;
};

// close a shift by facility
const closeShift = async (userId, shiftId) => {

    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility not found for this user");
    }

    const shift = await Shift.findOne({
        _id: shiftId,
        facility: facility._id
    });

    if (!shift) {
        throw new Error(
            "Shift not found or you are not authorized to close this shift"
        );
    }

    // don't allow a shift awaiting payment to be closed through this route
    if (shift.status === "pending_payment") {
        throw new Error(
            "This shift cannot be closed while payment is pending"
        );
    }

    // don't allow completed shifts to be closed again
    if (shift.status === "completed") {
        throw new Error(
            "A completed shift cannot be closed"
        );
    }

    shift.status = "closed";

    await shift.save();

    return shift;
};

// handles completion of a shift after all assigned workers have clocked out
const completeShift = async (userId, shiftId) => {

    const session = await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(async () => {

            const facility = await Facility.findOne({
                user: userId
            }).session(session);

            if (!facility) {
                throw new Error("Facility profile not found");
            }

            const shift = await Shift.findOne({
                _id: shiftId,
                facility: facility._id
            }).session(session);

            if (!shift) {
                throw new Error("Shift not found or you do not have permission to complete it");
            }

            // allow safe retries when completion has already succeeded
            const payment = await Payment.findOne({
                shift: shift._id,
                facility: facility._id
            }).session(session);

            if (!payment) {
                throw new Error("Payment record not found for this shift");
            }

            if (
                shift.status === "completed" &&
                payment.completionStatus === "confirmed"
            ) {
                result = { shift, payment };
                return;
            }

            // ensure the shift has been filled before completion
            if (shift.status !== "filled") {
                throw new Error("Only filled shifts can be completed");
            }

            // ensure there are assigned workers
            if (!shift.assignedWorkers || shift.assignedWorkers.length === 0) {
                throw new Error("Cannot complete a shift without assigned workers");
            }

            // ensure all required positions have been filled
            if (shift.assignedWorkers.length !== shift.professionalsNeeded) {
                throw new Error(
                    "The number of assigned workers does not match the required number of professionals"
                );
            }

            // ensure payment has been confirmed before completing the shift
            if (payment.fundingStatus !== "funded") {
                throw new Error("Shift payment has not been funded");
            }

            // prevent completion when a dispute is open
            if (payment.disputeStatus === "open") {
                throw new Error("Cannot confirm shift completion while a dispute is open");
            }

            // ensure all assigned workers have attendance records
            const attendanceRecords = await Attendance.find({
                shift: shift._id,
                worker: { $in: shift.assignedWorkers }
            }).session(session);

            if (attendanceRecords.length !== shift.assignedWorkers.length) {
                throw new Error("All assigned workers must have attendance records before completion");
            }

            // ensure every assigned worker has clocked out
            const allWorkersClockedOut = attendanceRecords.every(
                (attendance) => attendance.clockOutTime
            );

            if (!allWorkersClockedOut) {
                throw new Error("All assigned workers must clock out before completion");
            }

            // validate the total worker payout amount
            const totalWorkerPayoutKobo = payment.workerPayoutAmountKobo;
            const numberOfWorkers = shift.assignedWorkers.length;

            if (
                !Number.isSafeInteger(totalWorkerPayoutKobo) ||
                totalWorkerPayoutKobo < numberOfWorkers
            ) {
                throw new Error("Invalid worker payout amount");
            }

            // divide the total worker payout fairly, including any remaining kobo
            const basePayoutKobo = Math.floor(
                totalWorkerPayoutKobo / numberOfWorkers
            );

            let remainingKobo = totalWorkerPayoutKobo % numberOfWorkers;

            // prepare individual payout records for each assigned worker
            payment.workerPayouts = shift.assignedWorkers.map((workerId) => {
                const amountKobo =
                    basePayoutKobo + (remainingKobo > 0 ? 1 : 0);

                if (remainingKobo > 0) {
                    remainingKobo--;
                }

                return {
                    worker: workerId,
                    amountKobo,
                    status: "not_ready"
                };
            });

            // update payment completion status after facility confirmation
            payment.completionStatus = "confirmed";
            payment.completionConfirmedAt = new Date();

            // keep payouts unavailable until the provider transfer process is implemented
            payment.payoutStatus = "not_ready";

            await payment.save({ session });

            // mark the shift as completed
            shift.status = "completed";

            await shift.save({ session });

            result = { shift, payment };
        });

        return result;

    } finally {
        await session.endSession();
    }
};

// delete a shift by facility
const deleteShift = async (userId, shiftId) => {

    // find the facility belonging to the logged-in user
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error("Facility profile not found");
    }

    // find the shift belonging to the facility
    const shift = await Shift.findOne({
        _id: shiftId,
        facility: facility._id
    });

    if (!shift) {
        throw new Error(
            "Shift not found or you are not authorized to delete this shift"
        );
    }

    // don't allow deletion of a shift with assigned workers
    if (shift.assignedWorkers.length > 0) {
        throw new Error(
            "A shift with assigned workers cannot be deleted"
        );
    }

    // find the payment record associated with this shift
    const payment = await Payment.findOne({
        shift: shift._id,
        facility: facility._id
    });

    // don't allow deletion when a payment record exists
    if (payment) {
        throw new Error(
            "This shift has a payment record and cannot be deleted. Use a payment cancellation or refund process instead."
        );
    }

    // only allow deletion of unpublished or closed shifts
    if (!["pending_payment", "closed"].includes(shift.status)) {
        throw new Error(
            "Only shifts awaiting payment or closed shifts can be deleted"
        );
    }

    await shift.deleteOne();

    return shift;
};

export default {
    createShift,
    getAllShifts,
    getShiftById,
    getShiftsForFacility,
    updateShift,
    deleteShift,
    closeShift,
    completeShift
};