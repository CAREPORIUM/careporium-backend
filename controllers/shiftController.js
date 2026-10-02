import { createShift, getShifts, getShiftById ,updateShift,deleteShift} from "../services/shiftService.js";

const createShiftController = async (req, res) => {

    try {

        // Pass the authenticated user's ID so the service can identify the facility.
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

const getShiftByIdController = async (req, res) => {

    try {

        // Get the shift ID from the URL and pass it to the service.
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

const updateShiftController = async (req, res) => {

    try {

        // The user ID is used to verify that the facility owns the shift.
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

const deleteShiftController = async (req, res) => {

    try {

        // The user ID allows the service to verify shift ownership before deletion.
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

export { createShiftController, getShiftsController, getShiftByIdController, updateShiftController, deleteShiftController };
