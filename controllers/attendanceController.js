import {
    getShiftQrCode,
    clockIn,
    clockOut
} from "../services/attendanceService.js";

//handles request to retrieve the attendance QR code for a shift
const getQrCode = async (req, res) => {
    try {
        const { shiftId } = req.params;

        const qrCode = await getShiftQrCode(
            req.user.id,
            shiftId
        );

        res.status(200).json({
            success: true,
            message: "Attendance QR code retrieved successfully.",
            data: qrCode
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

//handles request for a worker to clock in
const workerClockIn = async (req, res) => {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({
                success: false,
                message: "QR token is required."
            });
        }

        const attendance = await clockIn(
            req.user.id,
            qrToken
        );

        res.status(201).json({
            success: true,
            message: "Worker clocked in successfully.",
            data: attendance
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

//handles request for a worker to clock out
const workerClockOut = async (req, res) => {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({
                success: false,
                message: "QR token is required."
            });
        }

        const attendance = await clockOut(
            req.user.id,
            qrToken
        );

        res.status(200).json({
            success: true,
            message: "Worker clocked out successfully.",
            data: attendance
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export default { getQrCode, workerClockIn, workerClockOut };