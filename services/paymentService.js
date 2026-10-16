import crypto from 'node:crypto';
import Payment from '../models/paymentModel.js';
import Shift from '../models/shiftModel.js';
import User from '../models/userModel.js';
import Facility from '../models/facilityModel.js'
import Worker from '../models/workerModel.js';

// calculate the total shift funding amount
const calculatePaymentAmounts = (payRate, professionalsNeeded) => {

    if (
        !Number.isFinite(Number(payRate)) ||
        Number(payRate) <= 0 ||
        !Number.isInteger(Number(professionalsNeeded)) ||
        Number(professionalsNeeded) < 1
    ) {
        throw new Error(
            'Pay rate and professionals needed must be valid positive numbers'
        );
    }

    const workerPayoutAmountKobo =
        Math.round(Number(payRate) * 100) *
        Number(professionalsNeeded);

    const platformCommissionAmountKobo =
        Math.round(workerPayoutAmountKobo * 0.10);

    const amountKobo =
        workerPayoutAmountKobo + platformCommissionAmountKobo;

    if (
        !Number.isSafeInteger(workerPayoutAmountKobo) ||
        !Number.isSafeInteger(amountKobo)
    ) {
        throw new Error('Payment amount is outside the supported range');
    }

    return {
        workerPayoutAmountKobo,
        platformCommissionAmountKobo,
        amountKobo
    };
};

// select the payment return URL for the client platform
const getPaymentReturnUrl = (clientPlatform = 'web') => {

    if (!['web', 'mobile'].includes(clientPlatform)) {
        throw new Error('Invalid client platform');
    }

    const returnUrl =
        clientPlatform === 'mobile'
            ? process.env.MOBILE_PAYMENT_RETURN_URL
            : process.env.WEB_PAYMENT_RETURN_URL;

    if (!returnUrl) {
        throw new Error('Payment return URL is not configured');
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(returnUrl);
    } catch {
        throw new Error(
            'A valid HTTPS payment return URL must be configured'
        );
    }

    if (
        parsedUrl.protocol !== 'https:' ||
        !parsedUrl.hostname
    ) {
        throw new Error(
            'A valid HTTPS payment return URL must be configured'
        );
    }

    return returnUrl;
};

// send a request to Paystack and parse its response
const requestPaystack = async (path, options = {}) => {

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
        throw new Error('Paystack secret key is not configured');
    }

    const response = await fetch(
        `https://api.paystack.co${path}`,
        {
            ...options,
            headers: {
                Authorization: `Bearer ${secretKey}`,
                ...(options.body
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...options.headers
            }
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.status !== true) {
        const error = new Error(
            data.message || 'Paystack request failed'
        );

        error.statusCode = response.status;

        throw error;
    }

    return data.data;
};

// generate a unique reference for a payment attempt
const generatePaymentReference = (shiftId) => {

    return `careporium-${shiftId}-${crypto.randomBytes(12).toString('hex')}`;
};

// retrieve a payment attempt by its reference
const getPaymentAttempt = (payment, reference) => {

    return payment.paymentAttempts.find(
        (attempt) => attempt.reference === reference
    );
};

// initiate payment checkout with Paystack
const initiatePaystackPayment = async (
    payment,
    facility,
    returnUrl,
    attempt
) => {

    const facilityUser = await User.findById(facility.user)
        .select('email');

    if (!facilityUser?.email) {
        throw new Error('Facility user email could not be found');
    }

    // persist the reference before contacting Paystack
    payment.providerReference = attempt.reference;
    payment.fundingStatus = 'pending';

    await payment.save();

    const data = await requestPaystack(
        '/transaction/initialize',
        {
            method: 'POST',
            body: JSON.stringify({
                reference: attempt.reference,
                amount: String(payment.amountKobo),
                email: facilityUser.email,
                currency: payment.currency,
                callback_url: returnUrl,
                metadata: {
                    paymentId: payment._id.toString(),
                    shiftId: payment.shift.toString(),
                    facilityId: payment.facility.toString(),
                    platform: 'CAREPORIUM',
                    paymentAttemptId: attempt._id.toString()
                }
            })
        }
    );

    if (
        !data.authorization_url ||
        data.reference !== attempt.reference
    ) {
        throw new Error(
            'Paystack did not return the expected checkout URL and reference'
        );
    }

    attempt.checkoutUrl = data.authorization_url;
    attempt.status = 'pending';

    payment.checkoutUrl = data.authorization_url;

    await payment.save();

    return payment;
};

// create a pending payment record for a shift
const createPendingPayment = async ({
    shift,
    facility,
    payRate,
    professionalsNeeded,
    clientPlatform = 'web'
}) => {

    const paymentProvider =
        process.env.PAYMENT_PROVIDER || 'mock';

    if (!['mock', 'paystack'].includes(paymentProvider)) {
        throw new Error('Unsupported payment provider');
    }

    if (
        process.env.NODE_ENV === 'production' &&
        paymentProvider === 'mock'
    ) {
        throw new Error('Mock payments are disabled in production');
    }

    const returnUrl = paymentProvider === 'paystack'
        ? getPaymentReturnUrl(clientPlatform)
        : undefined;

    const amounts = calculatePaymentAmounts(
        payRate,
        professionalsNeeded
    );

    const payment = await Payment.create({
        shift: shift._id,
        facility: facility._id,
        amountKobo: amounts.amountKobo,
        commissionRateBps: 1000,
        platformCommissionAmountKobo:
            amounts.platformCommissionAmountKobo,
        workerPayoutAmountKobo:
            amounts.workerPayoutAmountKobo,
        provider: paymentProvider,
        clientPlatform,
        fundingStatus: 'pending',
        completionStatus: 'pending',
        payoutStatus: 'not_ready',
        disputeStatus: 'none'
    });

    if (paymentProvider === 'paystack') {

        // create the first payment attempt
        payment.paymentAttempts.push({
            reference: generatePaymentReference(shift._id),
            status: 'pending'
        });

        const attempt =
            payment.paymentAttempts[payment.paymentAttempts.length - 1];

        payment.providerReference = attempt.reference;

        await payment.save();

        return initiatePaystackPayment(
            payment,
            facility,
            returnUrl,
            attempt
        );
    }

    return payment;
};

// retry funding for an existing shift payment
const retryShiftPayment = async ({ shift, facility }) => {

    const payment = await Payment.findOne({
        shift: shift._id,
        facility: facility._id
    });

    if (!payment) {
        throw new Error('Payment record not found for this shift');
    }

    if (shift.status !== 'pending_payment') {
        throw new Error('This shift is no longer awaiting payment');
    }

    if (payment.fundingStatus === 'funded') {
        return payment;
    }

    if (payment.provider !== 'paystack') {
        throw new Error(
            'Payment retry is only available for Paystack payments'
        );
    }

    if (payment.fundingStatus === 'refunded') {
        throw new Error('A refunded payment cannot be retried');
    }

    if (payment.disputeStatus === 'open') {
        throw new Error('A disputed payment cannot be retried');
    }

    // support payment records created before attempt tracking
    if (!payment.paymentAttempts) {
        payment.paymentAttempts = [];
    }

    if (
        payment.paymentAttempts.length === 0 &&
        payment.providerReference
    ) {
        payment.paymentAttempts.push({
            reference: payment.providerReference,
            checkoutUrl: payment.checkoutUrl || null,
            status: payment.fundingStatus === 'failed'
                ? 'failed'
                : 'pending'
        });
    }

    const latestAttempt =
        payment.paymentAttempts[payment.paymentAttempts.length - 1];

    // reuse the existing checkout while its transaction is pending
    if (
        latestAttempt &&
        latestAttempt.status === 'pending' &&
        latestAttempt.checkoutUrl
    ) {
        return payment;
    }

    const returnUrl = getPaymentReturnUrl(payment.clientPlatform);

    // retry initialization with the same reference when checkout is missing
    if (
        latestAttempt &&
        latestAttempt.status === 'pending' &&
        !latestAttempt.checkoutUrl
    ) {
        return initiatePaystackPayment(
            payment,
            facility,
            returnUrl,
            latestAttempt
        );
    }

    // create a new reference after a failed attempt
    const newAttempt = {
        reference: generatePaymentReference(shift._id),
        status: 'pending'
    };

    payment.paymentAttempts.push(newAttempt);

    const attempt =
        payment.paymentAttempts[payment.paymentAttempts.length - 1];

    payment.providerReference = attempt.reference;
    payment.checkoutUrl = null;
    payment.fundingStatus = 'pending';

    await payment.save();

    return initiatePaystackPayment(
        payment,
        facility,
        returnUrl,
        attempt
    );
};

// verify a Paystack transaction and fund the shift when confirmed
const verifyPaystackPayment = async (reference) => {

    if (
        typeof reference !== 'string' ||
        !reference.trim()
    ) {
        throw new Error('A valid Paystack transaction reference is required');
    }

    const payment = await Payment.findOne({
        provider: 'paystack',
        $or: [
            { providerReference: reference },
            { 'paymentAttempts.reference': reference }
        ]
    });

    if (!payment) {
        throw new Error('Paystack payment not found');
    }

    const attempt = getPaymentAttempt(payment, reference);

    if (
        payment.fundingStatus === 'refunded'
    ) {
        throw new Error('This payment has already been refunded');
    }

    // confirm transaction status directly with Paystack
    const transaction = await requestPaystack(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        { method: 'GET' }
    );

    if (
        transaction.reference !== reference ||
        Number(transaction.amount) !== payment.amountKobo ||
        transaction.currency !== payment.currency
    ) {
        throw new Error(
            'Paystack transaction reference, amount, or currency does not match'
        );
    }

    if (transaction.status !== 'success') {

        if (
            ['failed', 'abandoned', 'reversed'].includes(
                transaction.status
            )
        ) {
            // mark only the matching pending attempt as failed
            await Payment.updateOne(
                {
                    _id: payment._id,
                    'paymentAttempts.reference': reference,
                    'paymentAttempts.status': 'pending'
                },
                {
                    $set: {
                        'paymentAttempts.$.status': 'failed',
                        'paymentAttempts.$.failureReason':
                            `Paystack transaction status: ${transaction.status}`
                    }
                }
            );

            const currentPayment = await Payment.findById(payment._id);

            const hasPendingAttempt =
                currentPayment.paymentAttempts.some(
                    (item) => item.status === 'pending'
                );

            if (
                currentPayment.fundingStatus !== 'funded' &&
                !hasPendingAttempt
            ) {
                await Payment.updateOne(
                    {
                        _id: payment._id,
                        fundingStatus: 'pending'
                    },
                    {
                        $set: { fundingStatus: 'failed' }
                    }
                );
            }
        }

        return {
            payment: await Payment.findById(payment._id),
            verified: false,
            transactionStatus: transaction.status
        };
    }

    // do not process an attempt that cannot be reconciled
    if (
        !attempt &&
        payment.providerReference !== reference
    ) {
        throw new Error('Payment attempt could not be reconciled');
    }

    // already-funded attempts are safe to verify again
    if (
        payment.fundingStatus === 'funded' &&
        attempt?.status === 'funded'
    ) {
        return {
            payment,
            verified: true,
            alreadyFunded: true,
            duplicatePayment: false
        };
    }

    // a late success after another attempt funded the shift needs reconciliation
    if (payment.fundingStatus === 'funded') {

        await Payment.updateOne(
            {
                _id: payment._id,
                'paymentAttempts.reference': reference
            },
            {
                $set: {
                    'paymentAttempts.$.status': 'duplicate_success',
                    'paymentAttempts.$.providerTransactionId':
                        transaction.id != null
                            ? String(transaction.id)
                            : null,
                    'paymentAttempts.$.fundedAt': new Date(),
                    'paymentAttempts.$.failureReason':
                        'Additional successful charge requires reconciliation'
                }
            }
        );

        return {
            payment: await Payment.findById(payment._id),
            verified: true,
            alreadyFunded: true,
            duplicatePayment: true,
            message:
                'This transaction succeeded after the shift was already funded. Reconciliation is required.'
        };
    }

    // claim the successful payment without overwriting a refunded payment
    const updatedPayment = await Payment.findOneAndUpdate(
        {
            _id: payment._id,
            fundingStatus: { $in: ['pending', 'failed'] }
        },
        {
            $set: {
                fundingStatus: 'funded',
                providerReference: reference,
                providerTransactionId: transaction.id != null
                    ? String(transaction.id)
                    : null,
                fundedAt: new Date()
            }
        },
        { new: true }
    );

    if (!updatedPayment) {

        const currentPayment = await Payment.findById(payment._id);

        if (currentPayment.fundingStatus === 'refunded') {
            throw new Error('This payment has already been refunded');
        }

        if (currentPayment.fundingStatus === 'funded') {
            return {
                payment: currentPayment,
                verified: true,
                alreadyFunded: true,
                duplicatePayment: true,
                message:
                    'Another successful transaction has already funded this shift. Reconciliation is required.'
            };
        }

        throw new Error('Unable to reconcile payment status');
    }

    // record the successful attempt
    await Payment.updateOne(
        {
            _id: updatedPayment._id,
            'paymentAttempts.reference': reference
        },
        {
            $set: {
                'paymentAttempts.$.status': 'funded',
                'paymentAttempts.$.providerTransactionId':
                    transaction.id != null
                        ? String(transaction.id)
                        : null,
                'paymentAttempts.$.fundedAt': new Date(),
                'paymentAttempts.$.failureReason': null
            }
        }
    );

    // publish only if the shift is still awaiting payment
    await Shift.updateOne(
        {
            _id: updatedPayment.shift,
            status: 'pending_payment'
        },
        {
            $set: { status: 'open' }
        }
    );

    return {
        payment: await Payment.findById(updatedPayment._id),
        verified: true,
        alreadyFunded: false,
        duplicatePayment: false
    };
};

// handle verified Paystack webhook events
const handlePaystackWebhook = async (event) => {

    if (!event?.event) {
        throw new Error('Invalid Paystack webhook payload');
    }

    // Successful transaction events are verified again against Paystack.
    if (event.event === 'charge.success') {
        const reference = event.data?.reference;

        if (!reference) {
            throw new Error(
                'Paystack webhook is missing its transaction reference'
            );
        }

        return verifyPaystackPayment(reference);
    }

    // Other event types are not processed by this payment handler.
    return {
        received: true,
        processed: false,
        message: 'Event ignored'
    };
};

// simulate payment only while developing locally
const simulateMockPayment = async (paymentId) => {

    if (process.env.NODE_ENV === 'production') {
        throw new Error('Mock payments are disabled in production');
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.provider !== 'mock') {
        throw new Error('This is not a mock payment');
    }

    if (payment.fundingStatus === 'refunded') {
        throw new Error('A refunded payment cannot be funded');
    }

    payment.fundingStatus = 'funded';
    payment.providerEscrowStatus = 'funded';
    payment.fundedAt = payment.fundedAt || new Date();

    await payment.save();

    await Shift.findOneAndUpdate(
        {
            _id: payment.shift,
            status: 'pending_payment'
        },
        { $set: { status: 'open' } }
    );

    return payment;
};

// prepare a worker payout after shift completion
const prepareWorkerPayout = async ({ shiftId, workerId, facility }) => {

    const payment = await Payment.findOne({
        shift: shiftId,
        facility: facility._id
    });

    if (!payment) {
        throw new Error('Payment record not found');
    }

    if (payment.fundingStatus !== 'funded') {
        throw new Error('Shift payment has not been funded');
    }

    if (payment.completionStatus !== 'confirmed') {
        throw new Error('Shift completion has not been confirmed');
    }

    if (payment.disputeStatus === 'open') {
        throw new Error('Payout is blocked by an open dispute');
    }

    const shift = await Shift.findOne({
        _id: shiftId,
        facility: facility._id,
        status: 'completed'
    });

    if (!shift) {
        throw new Error('Completed shift not found for this facility');
    }

    const assignedWorker = shift.assignedWorkers.some(
        (worker) => worker.toString() === workerId.toString()
    );

    if (!assignedWorker) {
        throw new Error('Worker is not assigned to this shift');
    }

    const workerPayout = payment.workerPayouts.find(
        (payout) => payout.worker.toString() === workerId.toString()
    );

    if (!workerPayout) {
        throw new Error('Worker payout record not found');
    }

    if (workerPayout.status === 'paid') {
        return { payment, workerPayout, alreadyPaid: true };
    }

    if (['pending', 'processing'].includes(workerPayout.status)) {
        throw new Error('Worker payout is already being processed');
    }

    if (workerPayout.status === 'on_hold') {
        throw new Error('Worker payout is on hold');
    }

    workerPayout.status = 'pending';
    workerPayout.failureReason = undefined;
    payment.payoutStatus = 'pending';

    await payment.save();

    return { payment, workerPayout, alreadyPaid: false };
};

// process a worker payout through Paystack
const processWorkerPayout = async ({ shiftId, workerId, facility }) => {

    const payment = await Payment.findOne({
        shift: shiftId,
        facility: facility._id
    });

    if (!payment) {
        throw new Error('Payment record not found');
    }

    if (payment.fundingStatus !== 'funded') {
        throw new Error('Shift payment has not been funded');
    }

    if (payment.completionStatus !== 'confirmed') {
        throw new Error('Shift completion has not been confirmed');
    }

    if (payment.disputeStatus === 'open') {
        throw new Error('Payout is blocked by an open dispute');
    }

    const shift = await Shift.findOne({
        _id: shiftId,
        facility: facility._id,
        status: 'completed'
    });

    if (!shift) {
        throw new Error('Completed shift not found for this facility');
    }

    const assignedWorker = shift.assignedWorkers.some(
        (worker) => worker.toString() === workerId.toString()
    );

    if (!assignedWorker) {
        throw new Error('Worker is not assigned to this shift');
    }

    const workerPayout = payment.workerPayouts.find(
        (payout) => payout.worker.toString() === workerId.toString()
    );

    if (!workerPayout) {
        throw new Error('Worker payout record not found');
    }

    if (workerPayout.status === 'paid') {
        return { payment, workerPayout, alreadyPaid: true };
    }

    if (workerPayout.status === 'on_hold') {
        throw new Error('Worker payout is on hold');
    }

    if (['pending', 'processing'].includes(workerPayout.status)) {
        throw new Error(
            'Worker payout is already pending or processing'
        );
    }

    if (payment.provider !== 'paystack') {
        throw new Error('Paystack is required for real worker payouts');
    }

    // retrieve the worker's verified bank details
    const worker = await Worker.findById(workerId).select(
        '+payoutAccountNumber +paystackRecipientCode'
    );

    if (!worker) {
        throw new Error('Worker not found');
    }

    if (
        !worker.payoutDetailsVerified ||
        !worker.payoutBankCode ||
        !worker.payoutAccountNumber ||
        !worker.payoutAccountName
    ) {
        throw new Error(
            'Worker must have verified bank details before payout'
        );
    }

    if (
        !Number.isSafeInteger(workerPayout.amountKobo) ||
        workerPayout.amountKobo < 1
    ) {
        throw new Error('Worker payout amount is invalid');
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured');
    }

    // reuse a stable reference so retries can be reconciled
    if (!workerPayout.payoutReference) {
        workerPayout.payoutReference =
            `careporium-payout-${payment._id}-${workerPayout._id}-${crypto.randomBytes(8).toString('hex')}`;
    }

    // claim the payout before calling Paystack
    workerPayout.status = 'processing';
    workerPayout.failureReason = null;

    payment.payoutStatus = 'processing';

    await payment.save();

    try {

        // create a Paystack transfer recipient when one does not exist
        if (!worker.paystackRecipientCode) {

            const recipient = await requestPaystack(
                '/transferrecipient',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'nuban',
                        name: worker.payoutAccountName,
                        account_number: worker.payoutAccountNumber,
                        bank_code: worker.payoutBankCode,
                        currency: 'NGN'
                    })
                }
            );

            if (!recipient.recipient_code) {
                throw new Error(
                    'Paystack did not return a recipient code'
                );
            }

            worker.paystackRecipientCode = recipient.recipient_code;

            await worker.save();
        }

        workerPayout.providerRecipientCode =
            worker.paystackRecipientCode;

        await payment.save();

        // initiate the worker transfer
        const transfer = await requestPaystack(
            '/transfer',
            {
                method: 'POST',
                body: JSON.stringify({
                    source: 'balance',
                    amount: String(workerPayout.amountKobo),
                    recipient: worker.paystackRecipientCode,
                    reference: workerPayout.payoutReference,
                    reason: `CAREPORIUM shift payout ${shiftId}`
                })
            }
        );

        workerPayout.providerTransferCode =
            transfer.transfer_code || null;

        // Paystack transfer initiation is not proof of final payment
        workerPayout.status =
            transfer.status === 'success' ||
            transfer.status === 'completed'
                ? 'paid'
                : 'processing';

        if (workerPayout.status === 'paid') {
            workerPayout.paidAt = new Date();
        }

        payment.payoutStatus = payment.workerPayouts.every(
            (payout) => payout.status === 'paid'
        )
            ? 'paid'
            : 'processing';

        if (payment.payoutStatus === 'paid') {
            payment.paidAt = new Date();
        }

        await payment.save();

        return {
            payment,
            workerPayout,
            message: 'Paystack payout request processed successfully.'
        };

    } catch (error) {

        // keep the payout processing if the provider's outcome is uncertain
        // so a retry cannot accidentally send a second transfer
        workerPayout.failureReason = error.message;

        await payment.save();

        throw error;
    }
};

// verify the status of an existing Paystack transfer
const verifyWorkerPayout = async ({ shiftId, workerId, facility }) => {

    const payment = await Payment.findOne({
        shift: shiftId,
        facility: facility._id
    });

    if (!payment) {
        throw new Error('Payment record not found');
    }

    const workerPayout = payment.workerPayouts.find(
        (payout) => payout.worker.toString() === workerId.toString()
    );

    if (!workerPayout) {
        throw new Error('Worker payout record not found');
    }

    if (workerPayout.status === 'paid') {
        return {
            payment,
            workerPayout,
            verified: true,
            alreadyPaid: true
        };
    }

    if (!workerPayout.payoutReference) {
        throw new Error('Payout reference not found');
    }

    if (!['processing', 'pending'].includes(workerPayout.status)) {
        throw new Error(
            'Only pending or processing payouts can be reconciled'
        );
    }

    // retrieve the current transfer status from Paystack
    const transfer = await requestPaystack(
        `/transfer/verify/${encodeURIComponent(workerPayout.payoutReference)}`,
        { method: 'GET' }
    );

    if (
        transfer.reference !== workerPayout.payoutReference
    ) {
        throw new Error(
            'Paystack transfer reference does not match'
        );
    }

    workerPayout.providerTransferCode =
        transfer.transfer_code || workerPayout.providerTransferCode;

    if (transfer.status === 'success') {

        workerPayout.status = 'paid';
        workerPayout.paidAt = workerPayout.paidAt || new Date();
        workerPayout.failureReason = null;

    } else if (
        ['failed', 'reversed'].includes(transfer.status)
    ) {

        // do not retry automatically; confirm the failed transfer first
        workerPayout.status = 'failed';
        workerPayout.failureReason =
            `Paystack transfer status: ${transfer.status}`;

    } else {

        // pending or other non-final statuses must remain unpaid
        workerPayout.status = 'processing';
    }

    payment.payoutStatus = payment.workerPayouts.every(
        (payout) => payout.status === 'paid'
    )
        ? 'paid'
        : payment.workerPayouts.some(
            (payout) => payout.status === 'processing' ||
                        payout.status === 'pending'
        )
            ? 'processing'
            : payment.workerPayouts.some(
                (payout) => payout.status === 'on_hold'
            )
                ? 'on_hold'
                : payment.workerPayouts.some(
                    (payout) => payout.status === 'failed'
                )
                    ? 'failed'
                    : 'not_ready';

    if (payment.payoutStatus === 'paid') {
        payment.paidAt = payment.paidAt || new Date();
    }

    await payment.save();

    return {
        payment,
        workerPayout,
        verified: transfer.status === 'success',
        transferStatus: transfer.status
    };
};

// handles retrieval of payment history
const getPaymentHistory = async (userId, role) => {

    let payments;

    // retrieves payment history for a facility
    if (role === 'facility') {

        const facility = await Facility.findOne({ user: userId });

        if (!facility) {
            throw new Error('Facility profile not found.');
        }

        payments = await Payment.find({ facility: facility._id })
            .populate({
                path: 'shift',
                select: 'profession specialty shiftDate startTime endTime status'
            })
            .sort({ createdAt: -1 })
            .lean();

    }

    // retrieves payment history for a worker
        // retrieves payment history for a worker
    else if (role === 'worker') {

        const worker = await Worker.findOne({ user: userId });

        if (!worker) {
            throw new Error('Worker profile not found.');
        }

        const shifts = await Shift.find({
            assignedWorkers: worker._id
        }).select('_id');

        const shiftIds = shifts.map(shift => shift._id);

        payments = await Payment.find({
            shift: { $in: shiftIds }
        })
            .populate({
                path: 'shift',
                select: 'profession specialty shiftDate startTime endTime status'
            })
            .populate({
                path: 'facility',
                select: 'facilityName facilityType'
            })
            .sort({ createdAt: -1 })
            .lean();

        // return only the logged-in worker's payout information
        payments = payments.map((payment) => ({
            ...payment,
            workerPayouts: (payment.workerPayouts || []).filter(
                (payout) =>
                    payout.worker.toString() === worker._id.toString()
            )
        }));

    }

    // retrieves all payment history for an admin
    else if (role === 'admin') {

        payments = await Payment.find()
            .populate({
                path: 'shift',
                select: 'profession specialty shiftDate startTime endTime status'
            })
            .populate({
                path: 'facility',
                select: 'facilityName facilityType'
            })
            .sort({ createdAt: -1 })
            .lean();

    } else {
        throw new Error('Unauthorized to view payment history.');
    }

    return payments;
};


export default {
    createPendingPayment,
    retryShiftPayment,
    simulateMockPayment,
    handlePaystackWebhook,
    verifyPaystackPayment,
    prepareWorkerPayout,
    processWorkerPayout,
    verifyWorkerPayout,
    getPaymentHistory,
};