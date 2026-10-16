import Dispute from '../models/disputeModel.js';
import Payment from '../models/paymentModel.js';
import Shift from '../models/shiftModel.js';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';

// handles dispute creation
const createDispute = async ({
    userId,
    role,
    shiftId,
    reason,
    description,
    evidenceUrls = [],
}) => {
    // only workers and facilities can raise disputes
    if (!['worker', 'facility'].includes(role)) {
        throw new Error('Only workers and facilities can raise disputes');
    }

    // validate required fields
    if (!shiftId || !reason || !description) {
        throw new Error('Shift ID, reason and description are required');
    }

    if (!Array.isArray(evidenceUrls)) {
        throw new Error('Evidence URLs must be an array');
    }

    // retrieve the shift
    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error('Shift not found');
    }

    // retrieve the payment linked to the shift
    const payment = await Payment.findOne({ shift: shiftId });

    if (!payment) {
        throw new Error('Payment record not found for this shift');
    }

    // ensure the shift has been funded
    if (payment.fundingStatus !== 'funded') {
        throw new Error('A dispute can only be raised for a funded shift');
    }

    // verify the user is associated with the shift
    if (role === 'worker') {
        const worker = await Worker.findOne({ user: userId });

        if (!worker) {
            throw new Error('Worker profile not found');
        }

        const isAssigned = shift.assignedWorkers.some(
            (assignedWorker) =>
                assignedWorker.toString() === worker._id.toString()
        );

        if (!isAssigned) {
            throw new Error('You are not assigned to this shift');
        }
    }

    if (role === 'facility') {
        const facility = await Facility.findOne({ user: userId });

        if (!facility) {
            throw new Error('Facility profile not found');
        }

        if (shift.facility.toString() !== facility._id.toString()) {
            throw new Error('You do not own this shift');
        }
    }

    // prevent another active dispute for the same payment
    const existingDispute = await Dispute.findOne({
        payment: payment._id,
        status: { $in: ['open', 'under_review'] },
    });

    if (existingDispute) {
        throw new Error('An active dispute already exists for this shift payment');
    }

    // create the dispute record
    const dispute = await Dispute.create({
        payment: payment._id,
        shift: shift._id,
        raisedBy: userId,
        raisedByRole: role,
        reason: reason.trim(),
        description: description.trim(),
        evidenceUrls,
        status: 'open',
    });

    // mark payment as disputed
    payment.disputeStatus = 'open';
    payment.disputeReason = reason.trim();

    // hold payouts that have not already been paid or initiated
    for (const payout of payment.workerPayouts) {
        if (['not_ready', 'pending', 'failed'].includes(payout.status)) {
            payout.status = 'on_hold';
            payout.failureReason = 'Payout placed on hold due to an open dispute';
        }
    }

    // update overall payout status
    if (payment.workerPayouts.some((payout) => payout.status === 'on_hold')) {
        payment.payoutStatus = 'on_hold';
    }

    await payment.save();

    return dispute;
};

// retrieves a single dispute
const getDisputeById = async ({ disputeId, userId, role }) => {
    const dispute = await Dispute.findById(disputeId)
        .populate('shift')
        .populate('payment')
        .populate('raisedBy', 'email role');

    if (!dispute) {
        throw new Error('Dispute not found');
    }

    // admins can retrieve any dispute
    if (role === 'admin') {
        return dispute;
    }

    // only the user who raised the dispute can retrieve it
    if (dispute.raisedBy._id.toString() !== userId.toString()) {
        throw new Error('You are not authorized to view this dispute');
    }

    return dispute;
};

// retrieves disputes for admin review
const getAllDisputes = async ({ status } = {}) => {
    const filter = {};

    if (status) {
        filter.status = status;
    }

    return Dispute.find(filter)
        .populate('shift')
        .populate('payment')
        .populate('raisedBy', 'email role')
        .sort({ createdAt: -1 });
};

export default {
    createDispute,
    getDisputeById,
    getAllDisputes,
};