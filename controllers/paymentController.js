import crypto from 'crypto';

import paymentService from '../services/paymentService.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';

// verify the signature sent by HarrenaPay
const verifyHarrenaPaySignature = (rawBody, signature, secret) => {

    if (
        !signature ||
        !secret ||
        !Buffer.isBuffer(rawBody)
    ) {
        return false;
    }

    // validate the expected SHA-256 hexadecimal signature format
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(signature, 'hex');

    // compare signatures safely to prevent timing attacks
    return crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
    );
};


// handle webhook notifications from HarrenaPay
const handleHarrenaPayWebhook = async (req, res) => {

    try {

        const webhookSecret = process.env.HARRENAPAY_WEBHOOK_SECRET;

        // read the signature sent by HarrenaPay
        const signature = req.get('x-harrenapay-signature');

        // reject webhooks with invalid signatures
        const isValid = verifyHarrenaPaySignature(
            req.body,
            signature,
            webhookSecret
        );

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }

        // parse the original request body after signature verification
        let event;

        try {
            event = JSON.parse(req.body.toString('utf8'));
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook payload'
            });
        }

        // process the verified webhook
        await paymentService.handleHarrenaPayWebhook(event);

        return res.status(200).json({
            success: true,
            message: 'Webhook received'
        });

    } catch (error) {

        console.error(
            'HarrenaPay webhook error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to process webhook'
        });
    }
};


// retry funding for an existing shift
const retryShiftPayment = async (req, res) => {

    try {

        // allow only facility accounts to retry shift funding
        if (req.user.role !== 'facility') {
            return res.status(403).json({
                success: false,
                message: 'Only facility accounts can retry shift payments'
            });
        }

        // find the facility belonging to the logged-in user
        const facility = await Facility.findOne({
            user: req.user.id
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        // find the shift belonging to this facility
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

        // retry funding using the existing payment record
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

        console.error(
            'Retry shift payment error:',
            error.message
        );

        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message ||
                'Unable to retry shift payment',
            shiftId: error.shiftId
        });
    }
};

export default {
    handleHarrenaPayWebhook,
    retryShiftPayment
};