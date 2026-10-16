import shiftService from "../services/shiftService.js";

// receives the create shift request
const createShift = async (req, res) => {

    try {
        const { clientPlatform, ...shiftData } = req.body;

        const result = await shiftService.createShift(
            req.user.id,
            shiftData,
            clientPlatform
        );

        return res.status(201).json({
            message: "Shift created successfully",
            data: result
        });

    } catch (error) {
        return res.status(400).json({
            message: error.message,
            shiftId: error.shiftId
        });
    }
};

// get all available shifts
const getAllShifts = async (req, res) => {
    try {
        const { date, location, specialty, search } = req.query;

        const shifts = await shiftService.getAllShifts(
            req.user.id,
            {
                date,
                location,
                specialty,
                search
            }
        );

        return res.status(200).json({
            success: true,
            message: "Shifts fetched successfully",
            data: shifts
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// get shift by Id
const getShiftById = async (req, res) => {
    try {
        const shift = await shiftService.getShiftById(
            req.user.id,
            req.user.role,
            req.params.shiftId
        );

        return res.status(200).json({
            message: "Shift fetched successfully",
            data: shift
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// get all shifts belonging to a facility
const getShiftsForFacility = async (req, res) => {
    try {
        const shifts = await shiftService.getShiftsForFacility(
            req.user.id
        );

        return res.status(200).json({
            message: "Facility shifts retrieved successfully",
            data: shifts
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
};

// facility updates shift
const updateShift = async (req, res) => {
    try {
        const shift = await shiftService.updateShift(
            req.user.id,
            req.params.shiftId,
            req.body
        );

        return res.status(200).json({
            message: "Shift updated successfully",
            data: shift
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// get all applicants and applications for a facility
const getShiftsApplicationsForFacility = async (req, res) => {
    try {
        const applications =
            await shiftService.getApplicationsForFacility(req.user.id);

        return res.status(200).json({
            message: "Applications retrieved successfully.",
            data: applications
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
};

// handles request to retrieve all applicants for a specific shift
const getApplicantsForShiftController = async (req, res) => {
    try {
        const result = await shiftService.getApplicantsForShift(
            req.user.id,
            req.params.shiftId
        );

        return res.status(200).json({
            success: true,
            message: "Shift applicants retrieved successfully.",
            data: result
        });
    } catch (error) {
        const statusCode =
            error.message === "Facility not found for this user."
                ? 404
                : error.message === "Invalid shift ID"
                    ? 400
                    : error.message.includes("Shift not found")
                        ? 404
                        : error.message.includes("not authorized")
                            ? 403
                            : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

//update application status for a facility
const updateAppStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { status } = req.body;
    const application = await shiftService.updateApplicationStatus(
    req.user.id,
    req.params.applicationId,
    req.body.status
    );
    res.status(200).json({
      message: "Application status updated successfully.",
      data: application,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// close a shift
const closeShift = async (req, res) => {
    try {
        const shift = await shiftService.closeShift(
            req.user.id,
            req.params.shiftId
        );

        return res.status(200).json({
            message: "Shift closed successfully",
            data: shift
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
};

// handles request to complete a shift
const completeShift = async (req, res) => {
    try {
        const result = await shiftService.completeShift(
            req.user.id,
            req.params.shiftId
        );

        return res.status(200).json({
            success: true,
            message: "Shift completed and payment confirmation recorded successfully.",
            data: {
                shift: result.shift,
                payment: result.payment
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// deletes shift
const deleteShift = async (req, res) => {
    try {
        await shiftService.deleteShift(
            req.user.id,
            req.params.shiftId
        );

        return res.status(200).json({
            message: "Shift deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

export default {
    createShift,
    getAllShifts,
    getShiftById,
    getShiftsForFacility,
    getShiftsApplicationsForFacility,
    getApplicantsForShiftController,
    updateAppStatus,
    updateShift,
    closeShift,
    completeShift,
    deleteShift
};