import shiftService from "../services/shiftService.js";

// create shift
const createShift = async (req, res) => {
    try {

        const shift = await shiftService.createShift(
            req.user.id, 
            req.body);

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

// get all available shifts
const getAllShifts = async (req, res) => {
    try {
        const shifts = await shiftService.getAllShifts();

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

//get shift by Id
const getShiftById = async (req, res) => {
    try {

        const { shiftId } = req.params;

        const shift = await shiftService.getShiftById(
            req.user.id,
            req.user.role,
            shiftId
        );

        res.status(200).json({
            message: "Shift fetched successfully",
            data: shift
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// get all shifts belonging to a facility
const getShiftsForFacility = async(req, res) =>{
    try{ 
        const userId = req.user.id
        const shifts = await shiftService.getShiftsForFacility(userId)
        res.status(200).json({
            message: "Facility shifts retrieved successfully",
            data: shifts
        })
    }catch(error){
        res.status(400).json({
            error:error.message
        })
    }
}

// facility updates shift
const updateShift = async (req, res) => {
    try {
        const userId = req.user.id
        const { shiftId } = req.params
        const shift = await shiftService.updateShift(
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
}

// close a shift
const closeShift = async(req, res) => {
    try{
        const userId = req.user.id
        const {shiftId} = req.params
        const shift = await shiftService.closeShift(
            userId,
            shiftId
        )

        res.status(200).json({
            message: "Shift closed successfully",
            data: shift
        })
    }catch(error){
        res.status(400).json({
            error: error.message
        })
    }
}

// handles request to complete a shift
const completeShift = async (req, res) => {
    try {

        const { shiftId } = req.params;

        const shift = await shiftService.completeShift(
            req.user.id,
            shiftId
        );

        res.status(200).json({
            success: true,
            message: "Shift completed successfully.",
            data: shift
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const confirmShiftCompletion = async (req, res) => {
    try {
        const { shiftId } = req.params;

        const shift = await shiftService.confirmShiftCompletion(
            req.user.id,
            shiftId
        );

        res.status(200).json({
            success: true,
            message: "Shift completion confirmed successfully.",
            data: shift,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


// deletes shift
const deleteShift = async (req, res) => {
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
export default { createShift, getAllShifts, getShiftById, getShiftsForFacility, updateShift, closeShift, completeShift, confirmShiftCompletion, deleteShift };