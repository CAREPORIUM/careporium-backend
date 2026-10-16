import paymentService from '../services/paymentService.js';
import Shift from '../models/shiftModel.js';

// handles worker payout processing
const processWorkerPayout = async (req, res) => {

    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can process worker payouts'
            });
        }

        const { shiftId, workerId } = req.body;

        if (!shiftId || !workerId) {
            return res.status(400).json({
                success: false,
                message: 'Shift ID and worker ID are required'
            });
        }

        // retrieve the shift to identify its facility
        const shift = await Shift.findById(shiftId).select('facility');

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        // process the payout for the facility that owns the shift
        const payout = await paymentService.processWorkerPayout({
            shiftId,
            workerId,
            facility: { _id: shift.facility }
        });

        return res.status(200).json({
            success: true,
            message: payout.alreadyPaid
                ? 'Worker payout has already been paid'
                : 'Worker payout request processed successfully',
            data: payout
        });

    } catch (error) {

        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message ||
                'Failed to process worker payout'
        });
    }
};

// handles worker payout verification
const verifyWorkerPayout = async (req, res) => {

    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can verify worker payouts'
            });
        }

        const { shiftId, workerId } = req.body;

        if (!shiftId || !workerId) {
            return res.status(400).json({
                success: false,
                message: 'Shift ID and worker ID are required'
            });
        }

        // retrieve the shift to identify its facility
        const shift = await Shift.findById(shiftId).select('facility');

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        // verify the transfer for the facility that owns the shift
        const result = await paymentService.verifyWorkerPayout({
            shiftId,
            workerId,
            facility: { _id: shift.facility }
        });

        return res.status(200).json({
            success: true,
            message: result.verified
                ? 'Worker payout verified successfully'
                : 'Worker payout has not yet been confirmed as successful',
            data: result
        });

    } catch (error) {

        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message ||
                'Failed to verify worker payout'
        });
    }
};

// handles payment history retrieval
const getPaymentHistory = async (req, res) => {

    try {

        const payments = await paymentService.getPaymentHistory(
            req.user.id,
            req.user.role
        );

        return res.status(200).json({
            success: true,
            message: 'Payment history retrieved successfully',
            data: payments
        });

    } catch (error) {

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message ||
                'Failed to retrieve payment history'
        });
    }
};

export default {
    processWorkerPayout,
    verifyWorkerPayout,
    getPaymentHistory
};