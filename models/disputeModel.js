import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
    {
        // payment and shift involved in the dispute
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            required: true,
        },

        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
        },

        // user who raised the dispute
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        raisedByRole: {
            type: String,
            enum: ['worker', 'facility'],
            required: true,
        },

        // details of the complaint
        reason: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        evidenceUrls: {
            type: [String],
            default: [],
        },

        // dispute review status
        status: {
            type: String,
            enum: ['open', 'under_review', 'resolved', 'rejected'],
            default: 'open',
        },

        // admin resolution
        resolution: {
            type: String,
            enum: [
                'release_payout',
                'keep_payout_on_hold',
            ],
        },

        adminComment: {
            type: String,
            trim: true,
        },

        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        resolvedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// retrieve disputes by payment and status
disputeSchema.index({ payment: 1, status: 1 });

// retrieve disputes raised by a particular user
disputeSchema.index({ raisedBy: 1, createdAt: -1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;