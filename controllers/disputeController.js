import disputeService from '../services/disputeService.js';

// handles dispute creation
const createDispute = async (req, res) => {
    try {
        const { shiftId, reason, description, evidenceUrls } = req.body;

        const dispute = await disputeService.createDispute({
            userId: req.user.id,
            role: req.user.role,
            shiftId,
            reason,
            description,
            evidenceUrls,
        });

        return res.status(201).json({
            success: true,
            message: 'Dispute created successfully',
            data: dispute,
        });
    } catch (error) {
        const message = error.message || 'Failed to create dispute';

        const statusCode = message.includes('not authorized') ||
            message.includes('not assigned') ||
            message.includes('do not own') ||
            message.includes('Only workers and facilities')
                ? 403
                : message.includes('not found')
                    ? 404
                    : 400;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

// handles retrieval of a single dispute
const getDisputeById = async (req, res) => {
    try {
        const dispute = await disputeService.getDisputeById({
            disputeId: req.params.disputeId,
            userId: req.user.id,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            message: 'Dispute retrieved successfully',
            data: dispute,
        });
    } catch (error) {
        const message = error.message || 'Failed to retrieve dispute';

        const statusCode = message.includes('not authorized')
            ? 403
            : message.includes('not found')
                ? 404
                : 400;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

// handles retrieval of all disputes for admin review
const getAllDisputes = async (req, res) => {
    try {
        const { status } = req.query;

        const disputes = await disputeService.getAllDisputes({ status });

        return res.status(200).json({
            success: true,
            message: 'Disputes retrieved successfully',
            data: disputes,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve disputes',
        });
    }
};

export default {
    createDispute,
    getDisputeById,
    getAllDisputes,
};