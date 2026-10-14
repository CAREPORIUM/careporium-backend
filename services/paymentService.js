import Payment from '../models/paymentModel.js';
import Shift from '../models/shiftModel.js';
import User from '../models/userModel.js';

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

    if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname) {
        throw new Error(
            'A valid HTTPS payment return URL must be configured'
        );
    }

    return returnUrl;
};

// retrieve the configured HarrenaPay base URL
const getHarrenaPayBaseUrl = () => {

    const baseUrl = (
        process.env.HARRENAPAY_BASE_URL ||
        'https://www.harrenapay.com/api/public/v1'
    ).replace(/\/+$/, '');

    let parsedUrl;

    try {
        parsedUrl = new URL(baseUrl);
    } catch {
        throw new Error('Invalid HarrenaPay base URL');
    }

    if (
        parsedUrl.protocol !== 'https:' ||
        !parsedUrl.hostname
    ) {
        throw new Error('HarrenaPay base URL must use HTTPS');
    }

    return baseUrl;
};

// send a request to HarrenaPay and parse its response
const requestHarrenaPay = async (path, options = {}) => {

    const apiKey = process.env.HARRENAPAY_API_KEY;

    if (!apiKey) {
        throw new Error('HarrenaPay API key is not configured');
    }

    const response = await fetch(
        `${getHarrenaPayBaseUrl()}${path}`,
        {
            ...options,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...(options.body
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...options.headers
            }
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.message ||
            data.error ||
            'HarrenaPay request failed'
        );

        error.statusCode = response.status;

        throw error;
    }

    return data;
};

// initiate escrow funding with HarrenaPay
const initiateHarrenaPayEscrow = async (
    payment,
    facility,
    returnUrl
) => {

    const facilityUser = await User.findById(facility.user)
        .select('email');

    if (!facilityUser?.email) {
        throw new Error('Facility user email could not be found');
    }

    const data = await requestHarrenaPay(
        '/escrow/initiate',
        {
            method: 'POST',
            body: JSON.stringify({
                reference: payment.providerReference,
                amount: payment.amountKobo,
                currency: payment.currency,
                customer_email: facilityUser.email,
                customer_name: facility.facilityName,
                description: `CAREPORIUM shift funding - ${payment.shift}`,
                return_url: returnUrl,
                release_window_hours: 168
            })
        }
    );

    if (!data.checkout_url) {
        throw new Error(
            'HarrenaPay did not return a checkout URL'
        );
    }

    payment.providerEscrowId = data.escrow_id;
    payment.checkoutUrl = data.checkout_url;
    payment.virtualAccountNumber =
        data.account_number || data.virtual_account_number;
    payment.bankName = data.bank_name;
    payment.expiresAt = data.expires_at
        ? new Date(data.expires_at)
        : undefined;
    payment.providerEscrowStatus = 'awaiting_payment';
    payment.fundingStatus = 'pending';

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

    if (!['mock', 'harrenapay'].includes(paymentProvider)) {
        throw new Error('Unsupported payment provider');
    }

    if (
        process.env.NODE_ENV === 'production' &&
        paymentProvider === 'mock'
    ) {
        throw new Error('Mock payments are disabled in production');
    }

    const returnUrl = paymentProvider === 'harrenapay'
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
        providerReference: `careporium_shift_${shift._id}`,
        clientPlatform,
        fundingStatus: 'pending',
        completionStatus: 'pending',
        payoutStatus: 'not_ready',
        disputeStatus: 'none'
    });

    if (paymentProvider === 'harrenapay') {
        try {
            return await initiateHarrenaPayEscrow(
                payment,
                facility,
                returnUrl
            );
        } catch (error) {
            payment.fundingStatus = 'failed';
            await payment.save();
            throw error;
        }
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

    if (payment.provider !== 'harrenapay') {
        throw new Error(
            'Payment retry is only available for HarrenaPay payments'
        );
    }

    if (payment.fundingStatus === 'refunded') {
        throw new Error('A refunded payment cannot be retried');
    }

    const returnUrl = getPaymentReturnUrl(
        payment.clientPlatform || 'web'
    );

    payment.fundingStatus = 'pending';
    await payment.save();

    try {
        return await initiateHarrenaPayEscrow(
            payment,
            facility,
            returnUrl
        );
    } catch (error) {
        payment.fundingStatus = 'failed';
        await payment.save();
        throw error;
    }
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

// simulate HarrenaPay sandbox funding using its documented endpoint
const simulateHarrenaPaySandboxFunding = async (paymentId) => {

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Sandbox funding simulation is disabled in production'
        );
    }

    if (!process.env.HARRENAPAY_API_KEY?.startsWith('hpay_test_')) {
        throw new Error(
            'A HarrenaPay sandbox API key beginning with hpay_test_ is required'
        );
    }

    const payment = await Payment.findOne({
        _id: paymentId,
        provider: 'harrenapay'
    });

    if (!payment) {
        throw new Error('HarrenaPay payment not found');
    }

    if (payment.fundingStatus === 'funded') {
        return payment;
    }

    await requestHarrenaPay(
        `/escrow/${encodeURIComponent(payment.providerReference)}/simulate-fund`,
        { method: 'POST' }
    );

    // Funding is confirmed by the verified webhook or status reconciliation.
    return payment;
};

// retrieve payment status from HarrenaPay
const getPaymentStatus = async (providerReference) => {

    const payment = await Payment.findOne({ providerReference });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.provider !== 'harrenapay') {
        throw new Error('This payment does not use HarrenaPay');
    }

    return requestHarrenaPay(
        `/escrow/${encodeURIComponent(providerReference)}`,
        { method: 'GET' }
    );
};

// handles verified webhook events from HarrenaPay
const handleHarrenaPayWebhook = async (event) => {

    const { event: eventType, reference, amount, currency } = event || {};

    if (!eventType || !reference) {
        throw new Error('Invalid HarrenaPay webhook payload');
    }

    const supportedEvents = [
        'escrow.funded',
        'payment.success',
        'payment.failed',
        'escrow.accepted',
        'escrow.declined',
        'escrow.delivered',
        'escrow.released',
        'escrow.refunded',
        'dispute.opened'
    ];

    if (!supportedEvents.includes(eventType)) {
        return {
            received: true,
            processed: false,
            message: 'Event ignored'
        };
    }

    const payment = await Payment.findOne({
        providerReference: reference,
        provider: 'harrenapay'
    });

    if (!payment) {
        throw new Error('Payment not found for this provider reference');
    }

    if (
        eventType === 'escrow.funded' ||
        eventType === 'payment.success'
    ) {
        if (
            amount === undefined ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) !== payment.amountKobo ||
            currency !== payment.currency
        ) {
            throw new Error(
                'Funding webhook amount or currency does not match the payment'
            );
        }

        if (payment.fundingStatus === 'funded') {
            return {
                received: true,
                processed: false,
                message: 'Payment was already funded'
            };
        }

        if (
            payment.fundingStatus === 'refunded' ||
            payment.fundingStatus === 'failed'
        ) {
            throw new Error(
                'Payment cannot transition to funded from its current status'
            );
        }

        payment.fundingStatus = 'funded';
        payment.providerEscrowStatus = 'funded';
        payment.fundedAt = new Date();

        await payment.save();

        await Shift.findOneAndUpdate(
            {
                _id: payment.shift,
                status: 'pending_payment'
            },
            { $set: { status: 'open' } }
        );

        return { received: true, processed: true };
    }

    if (eventType === 'payment.failed') {
        if (
            payment.fundingStatus === 'funded' ||
            payment.fundingStatus === 'refunded'
        ) {
            return {
                received: true,
                processed: false,
                message: 'Payment is already funded or refunded'
            };
        }

        payment.fundingStatus = 'failed';
        payment.providerEscrowStatus = 'failed';
    }

    if (eventType === 'escrow.accepted') {
        payment.providerEscrowStatus = 'accepted';
    }

    if (eventType === 'escrow.delivered') {
        payment.providerEscrowStatus = 'delivered';
    }

    if (eventType === 'escrow.released') {
        // Escrow release does not prove a CAREPORIUM worker was paid.
        payment.providerEscrowStatus = 'released';
    }

    if (eventType === 'escrow.refunded') {
        payment.fundingStatus = 'refunded';
        payment.providerEscrowStatus = 'refunded';
        payment.payoutStatus = 'on_hold';
        payment.workerPayouts.forEach((payout) => {
            if (payout.status !== 'paid') {
                payout.status = 'on_hold';
            }
        });
    }

    if (eventType === 'dispute.opened') {
        payment.disputeStatus = 'open';
        payment.payoutStatus = 'on_hold';
        payment.providerEscrowStatus = 'disputed';
        payment.workerPayouts.forEach((payout) => {
            if (payout.status !== 'paid') {
                payout.status = 'on_hold';
            }
        });
    }

    if (eventType === 'escrow.declined') {
        payment.providerEscrowStatus = 'declined';
        payment.payoutStatus = 'on_hold';
    }

    await payment.save();

    return { received: true, processed: true };
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

// simulate a worker payout for end-to-end development testing only
const simulateWorkerPayout = async ({ shiftId, workerId, facility }) => {

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Simulated worker payouts are disabled in production'
        );
    }

    const { payment, alreadyPaid } = await prepareWorkerPayout({
        shiftId,
        workerId,
        facility
    });

    if (alreadyPaid) {
        return { payment, alreadyPaid: true };
    }

    const workerPayout = payment.workerPayouts.find(
        (payout) => payout.worker.toString() === workerId.toString()
    );

    workerPayout.status = 'paid';
    workerPayout.payoutReference =
        `mock_payout_${payment._id}_${workerId}`;
    workerPayout.paidAt = new Date();

    const unpaidPayouts = payment.workerPayouts.filter(
        (payout) => payout.status !== 'paid'
    );

    payment.payoutStatus = unpaidPayouts.length === 0
        ? 'paid'
        : 'pending';

    if (payment.payoutStatus === 'paid') {
        payment.paidAt = new Date();
    }

    await payment.save();

    return { payment, workerPayout, alreadyPaid: false };
};

export default {
    createPendingPayment,
    retryShiftPayment,
    simulateMockPayment,
    simulateHarrenaPaySandboxFunding,
    getPaymentStatus,
    handleHarrenaPayWebhook,
    prepareWorkerPayout,
    simulateWorkerPayout
};