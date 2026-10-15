import mongoose from 'mongoose';

// stores individual attempts to fund a shift
const paymentAttemptSchema = new mongoose.Schema(
    {
        reference: {
            type: String,
            required: true
        },
        checkoutUrl: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: [
                'pending',
                'failed',
                'funded',
                'duplicate_success'
            ],
            default: 'pending'
        },
        providerTransactionId: {
            type: String,
            default: null
        },
        failureReason: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        fundedAt: {
            type: Date,
            default: null
        }
    },
    { _id: true }
);

// stores each worker's payout for a completed shift
const workerPayoutSchema = new mongoose.Schema(
    {
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker',
            required: true
        },
        amountKobo: {
            type: Number,
            required: true,
            min: 1
        },
        status: {
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
        payoutReference: {
            type: String,
            default: null
        },
        providerTransferCode: {
            type: String,
            default: null
        },
        providerRecipientCode: {
            type: String,
            default: null
        },
        paidAt: {
            type: Date,
            default: null
        },
        failureReason: {
            type: String,
            default: null
        }
    },
    { _id: true }
);

// stores payment and payout details for a shift
const paymentSchema = new mongoose.Schema(
    {
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
            unique: true
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },
        currency: {
            type: String,
            default: 'NGN'
        },
        amountKobo: {
            type: Number,
            required: true,
            min: 1
        },
        commissionRateBps: {
            type: Number,
            default: 1000
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
        workerPayouts: {
            type: [workerPayoutSchema],
            default: []
        },
        paymentAttempts: {
            type: [paymentAttemptSchema],
            default: []
        },
        provider: {
            type: String,
            enum: ['mock', 'harrenapay', 'paystack'],
            default: 'paystack'
        },
        providerReference: {
            type: String,
            default: undefined
        },
        providerTransactionId: {
            type: String,
            default: null
        },
        providerEscrowId: {
            type: String,
            default: null
        },
        providerEscrowStatus: {
            type: String,
            default: null
        },
        checkoutUrl: {
            type: String,
            default: null
        },
        virtualAccountNumber: {
            type: String,
            default: null
        },
        bankName: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        },
        fundingStatus: {
            type: String,
            enum: ['pending', 'funded', 'failed', 'refunded'],
            default: 'pending'
        },
        completionStatus: {
            type: String,
            enum: ['pending', 'submitted', 'confirmed', 'disputed'],
            default: 'pending'
        },
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
        disputeStatus: {
            type: String,
            enum: ['none', 'open', 'resolved'],
            default: 'none'
        },
        disputeReason: {
            type: String,
            default: null
        },
        payoutReference: {
            type: String,
            default: null
        },
        fundedAt: {
            type: Date,
            default: null
        },
        completionConfirmedAt: {
            type: Date,
            default: null
        },
        paidAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// ensure payment references can be looked up efficiently
paymentSchema.index(
    { providerReference: 1 },
    { unique: true, sparse: true }
);

// retrieve payments for a facility
paymentSchema.index({ facility: 1, createdAt: -1 });

// retrieve payments by funding and payout status
paymentSchema.index({ fundingStatus: 1, payoutStatus: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;