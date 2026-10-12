
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
    {
        // links the payment to the shift
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
            unique: true
        },

        // links the payment to the facility funding the shift
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },

        // all monetary amounts are stored in kobo
        currency: {
            type: String,
            enum: ['NGN'],
            default: 'NGN',
            required: true
        },

        amountKobo: {
            type: Number,
            required: true,
            min: 1
        },

        // commission is calculated according to the agreed platform rate
        commissionRateBps: {
            type: Number,
            required: true,
            min: 0,
            max: 10000
        },

        platformCommissionAmountKobo: {
            type: Number,
            default: 0,
            min: 0
        },

        workerPayoutAmountKobo: {
            type: Number,
            default: 0,
            min: 0
        },

        // payment provider can be changed without redesigning the model
        provider: {
            type: String,
            enum: ['mock', 'harrenapay'],
            default: 'harrenapay',
            required: true
        },

        providerReference: {
            type: String,
            sparse: true,
            unique: true
        },

        // stores HarrenaPay escrow and checkout details
        providerEscrowId: {
            type: String,
            sparse: true
        },

        checkoutUrl: {
            type: String,
            trim: true
        },

        virtualAccountNumber: {
            type: String,
            trim: true
        },

        bankName: {
            type: String,
            trim: true
        },

        // stores when the provider's funding instructions expire
        expiresAt: {
            type: Date
        },

        // tracks funding independently from shift completion and payout
        fundingStatus: {
            type: String,
            enum: ['pending', 'funded', 'failed', 'refunded'],
            default: 'pending'
        },

        // tracks shift completion and facility confirmation
        completionStatus: {
            type: String,
            enum: ['pending', 'submitted', 'confirmed', 'disputed'],
            default: 'pending'
        },

        // tracks the worker payout independently from funding
        payoutStatus: {
            type: String,
            enum: [
                'not_ready',
                'pending',
                'processing',
                'paid',
                'failed',
                'on_hold'
            ],
            default: 'not_ready'
        },

        clientPlatform: {
            type: String,
            enum: ['web', 'mobile'],
            default: 'web'
        },

        // tracks disputes that prevent payout
        disputeStatus: {
            type: String,
            enum: ['none', 'open', 'resolved'],
            default: 'none'
        },

        disputeReason: {
            type: String,
            trim: true
        },

        payoutReference: {
            type: String,
            sparse: true
        },

        fundedAt: {
            type: Date
        },

        completionConfirmedAt: {
            type: Date
        },

        paidAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;