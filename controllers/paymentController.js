import crypto from 'crypto';
import Payment from '../models/paymentModel.js';
import paymentService from '../services/paymentService.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';

// verify the signature sent by HarrenaPay
const verifyHarrenaPaySignature = (rawBody, signature, secret) => {

    if (!signature || !secret || !Buffer.isBuffer(rawBody)) {
        return false;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
    );
};

// handle webhook notifications from HarrenaPay
const handleHarrenaPayWebhook = async (req, res) => {

    try {
        const signature = req.get('x-harrenapay-signature');

        if (!verifyHarrenaPaySignature(
            req.body,
            signature,
            process.env.HARRENAPAY_WEBHOOK_SECRET
        )) {
            return res.status(401).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }

        let event;

        try {
            event = JSON.parse(req.body.toString('utf8'));
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook payload'
            });
        }

        const result =
            await paymentService.handleHarrenaPayWebhook(event);

        return res.status(200).json({
            success: true,
            message: 'Webhook received',
            data: result
        });
    } catch (error) {
        console.error('HarrenaPay webhook error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Unable to process webhook'
        });
    }
};

// retry funding for an existing shift
const retryShiftPayment = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facility accounts can retry shift payments'
            });
        }

        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        const shift = await Shift.findOne({
            _id: req.params.shiftId,
            facility: facility._id
        });

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found for this facility'
            });
        }

        const payment = await paymentService.retryShiftPayment({
            shift,
            facility
        });

        return res.status(200).json({
            success: true,
            message: 'Payment funding request processed',
            data: { shiftId: shift._id, payment }
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || 'Unable to retry shift payment'
        });
    }
};

// retrieve payment history for a facility
const getPaymentHistory = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facilities can view payment history'
            });
        }

        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility profile not found'
            });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            50,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );

        const filter = { facility: facility._id };

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .populate('shift', 'profession shiftDate shiftType status')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select(
                    'shift amountKobo currency platformCommissionAmountKobo workerPayoutAmountKobo provider providerReference checkoutUrl virtualAccountNumber bankName expiresAt fundingStatus completionStatus payoutStatus providerEscrowStatus disputeStatus workerPayouts createdAt fundedAt completionConfirmedAt paidAt'
                ),
            Payment.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Payment history retrieved successfully',
            data: {
                payments,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// retrieve payment status for a shift
const getShiftPaymentStatus = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facilities can view shift payment status'
            });
        }

        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility profile not found'
            });
        }

        const payment = await Payment.findOne({
            shift: req.params.shiftId,
            facility: facility._id
        })
            .populate('shift', 'profession shiftDate shiftType status')
            .select(
                'shift amountKobo currency platformCommissionAmountKobo workerPayoutAmountKobo provider providerReference checkoutUrl virtualAccountNumber bankName expiresAt fundingStatus completionStatus payoutStatus providerEscrowStatus disputeStatus workerPayouts createdAt fundedAt completionConfirmedAt paidAt'
            );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this shift'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Shift payment status retrieved successfully',
            data: payment
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// simulate HarrenaPay sandbox funding
const simulateSandboxFunding = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facilities can simulate sandbox funding'
            });
        }

        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility profile not found'
            });
        }

        const payment = await Payment.findOne({
            shift: req.params.shiftId,
            facility: facility._id,
            provider: 'harrenapay'
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'HarrenaPay payment not found'
            });
        }

        await paymentService.simulateHarrenaPaySandboxFunding(
            payment._id
        );

        return res.status(200).json({
            success: true,
            message: 'Sandbox funding simulation requested. Funding status is confirmed by webhook or provider reconciliation.'
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

// simulate a worker payout for development testing only
const simulateWorkerPayout = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facilities can initiate this test action'
            });
        }

        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility profile not found'
            });
        }

        const result = await paymentService.simulateWorkerPayout({
            shiftId: req.params.shiftId,
            workerId: req.params.workerId,
            facility
        });

        return res.status(200).json({
            success: true,
            message: 'Development payout simulation completed',
            data: result
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

export default {
    handleHarrenaPayWebhook,
    retryShiftPayment,
    getPaymentHistory,
    getShiftPaymentStatus,
    simulateSandboxFunding,
    simulateWorkerPayout
};