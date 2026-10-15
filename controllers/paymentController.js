
import crypto from 'crypto';
import Payment from '../models/paymentModel.js';
import paymentService from '../services/paymentService.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';

// verify the signature sent by Paystack
const verifyPaystackSignature = (rawBody, signature, secret) => {

    if (!signature || !secret || !Buffer.isBuffer(rawBody)) {
        return false;
    }

    if (!/^[a-fA-F0-9]{128}$/.test(signature)) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha512', secret)
        .update(rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
    );
};

// handle webhook notifications from Paystack
const handlePaystackWebhook = async (req, res) => {

    try {
        const signature = req.get('x-paystack-signature');

        // ensure the original raw request body is available
        if (!Buffer.isBuffer(req.body)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook request body'
            });
        }

        if (!verifyPaystackSignature(
            req.body,
            signature,
            process.env.PAYSTACK_SECRET_KEY
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
            await paymentService.handlePaystackWebhook(event);

        return res.status(200).json({
            success: true,
            message: 'Webhook received',
            data: result
        });
    } catch (error) {
        console.error('Paystack webhook error:', error.message);

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
            data: {
                shiftId: shift._id,
                payment
            }
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

        const filter = {
            facility: facility._id
        };

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .populate('shift', 'profession shiftDate shiftType status')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select(
                    'shift amountKobo currency platformCommissionAmountKobo workerPayoutAmountKobo provider providerReference checkoutUrl fundingStatus completionStatus payoutStatus disputeStatus workerPayouts createdAt fundedAt completionConfirmedAt paidAt'
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
                'shift amountKobo currency platformCommissionAmountKobo workerPayoutAmountKobo provider providerReference checkoutUrl fundingStatus completionStatus payoutStatus disputeStatus workerPayouts createdAt fundedAt completionConfirmedAt paidAt'
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

// verify a shift payment directly with Paystack
const verifyShiftPayment = async (req, res) => {

    try {
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facilities can verify shift payments'
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
            provider: 'paystack'
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Paystack payment not found for this shift'
            });
        }

        if (!payment.providerReference) {
            return res.status(400).json({
                success: false,
                message: 'No Paystack transaction reference exists for this payment'
            });
        }

        const result = await paymentService.verifyPaystackPayment(
            payment.providerReference
        );

        return res.status(200).json({
            success: true,
            message: result.verified
                ? 'Payment verified successfully'
                : 'Payment has not been confirmed',
            data: {
                shiftId: payment.shift,
                fundingStatus: result.payment.fundingStatus,
                verified: result.verified,
                transactionStatus: result.transactionStatus
            }
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || 'Unable to verify shift payment'
        });
    }
};

// reject the old HarrenaPay sandbox action
const simulateSandboxFunding = async (req, res) => {

    return res.status(410).json({
        success: false,
        message: 'HarrenaPay sandbox funding is no longer supported. Use Paystack test checkout and verification.'
    });
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

        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Worker payout simulation is disabled in production'
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
    handlePaystackWebhook,
    retryShiftPayment,
    getPaymentHistory,
    getShiftPaymentStatus,
    verifyShiftPayment,
    simulateSandboxFunding,
    simulateWorkerPayout
};
