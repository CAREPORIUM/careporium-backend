
import mongoose from "mongoose";

const workerPayoutSchema = new mongoose.Schema(
    {
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Worker",
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
                "not_ready",
                "pending",
                "processing",
                "paid",
                "failed",
                "on_hold"
            ],
            default: "not_ready"
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
    {
        _id: false
    }
);

const paymentSchema = new mongoose.Schema(
    {
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
            required: true,
            unique: true
        },

        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true
        },

        currency: {
            type: String,
            enum: ["NGN"],
            default: "NGN"
        },

        // Total amount charged for the entire shift, in kobo
        amountKobo: {
            type: Number,
            required: true,
            min: 1
        },

        // Platform commission expressed in basis points
        // 1000 basis points = 10%
        commissionRateBps: {
            type: Number,
            required: true,
            min: 0,
            default: 1000
        },

        // CAREPORIUM's commission, in kobo
        platformCommissionAmountKobo: {
            type: Number,
            required: true,
            min: 0
        },

        // Total amount allocated to all assigned workers, in kobo
        workerPayoutAmountKobo: {
            type: Number,
            required: true,
            min: 1
        },

        // Individual worker payout records
        workerPayouts: {
            type: [workerPayoutSchema],
            default: []
        },

        // Payment provider used for this transaction
        // HarrenaPay remains available for legacy payment records
        provider: {
            type: String,
            enum: ["mock", "harrenapay", "paystack"],
            default: "mock"
        },

        // Internal or provider payment reference
        providerReference: {
            type: String,
            unique: true,
            sparse: true
        },

        // Paystack transaction ID returned by the provider
        providerTransactionId: {
            type: String,
            default: null
        },

        // Legacy HarrenaPay escrow identifier
        providerEscrowId: {
            type: String,
            default: null
        },

        // Legacy HarrenaPay escrow status
        providerEscrowStatus: {
            type: String,
            enum: [
                "pending",
                "awaiting_payment",
                "funded",
                "accepted",
                "delivered",
                "released",
                "refunded",
                "declined",
                "disputed",
                "failed"
            ],
            default: "pending"
        },

        // Checkout URL returned by the payment provider
        checkoutUrl: {
            type: String,
            default: null
        },

        // Legacy virtual account details
        virtualAccountNumber: {
            type: String,
            default: null
        },

        bankName: {
            type: String,
            default: null
        },

        // Expiry time for the payment checkout, if provided
        expiresAt: {
            type: Date,
            default: null
        },

        // Whether the facility's payment has been received
        fundingStatus: {
            type: String,
            enum: [
                "pending",
                "funded",
                "failed",
                "refunded"
            ],
            default: "pending"
        },

        // Whether shift completion has been confirmed
        completionStatus: {
            type: String,
            enum: [
                "pending",
                "submitted",
                "confirmed",
                "disputed"
            ],
            default: "pending"
        },

        // Overall status of worker payouts
        payoutStatus: {
            type: String,
            enum: [
                "not_ready",
                "pending",
                "processing",
                "paid",
                "failed",
                "on_hold"
            ],
            default: "not_ready"
        },

        // Platform where the facility initiated payment
        clientPlatform: {
            type: String,
            enum: ["web", "mobile"],
            default: "web"
        },

        // Dispute tracking
        disputeStatus: {
            type: String,
            enum: ["none", "open", "resolved"],
            default: "none"
        },

        disputeReason: {
            type: String,
            default: null
        },

        // Legacy or overall payout reference
        payoutReference: {
            type: String,
            default: null
        },

        // Payment and completion timestamps
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

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
