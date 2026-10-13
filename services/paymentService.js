import Payment from '../models/paymentModel.js';
import Shift from '../models/shiftModel.js';
import User from '../models/userModel.js';

// calculate the total shift funding amount
const calculatePaymentAmounts = (payRate, professionalsNeeded) => {

    // validate the payment amounts
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

    // convert the amount per worker from naira to kobo
    const workerPayoutAmountKobo =
        Math.round(Number(payRate) * 100) *
        Number(professionalsNeeded);

    // calculate CAREPORIUM's 10% commission
    const platformCommissionAmountKobo =
        Math.round(workerPayoutAmountKobo * 0.10);

    // calculate the total amount the facility must fund
    const amountKobo =
        workerPayoutAmountKobo + platformCommissionAmountKobo;

    return {
        workerPayoutAmountKobo,
        platformCommissionAmountKobo,
        amountKobo
    };
};

// select the payment return URL for the client platform
const getPaymentReturnUrl = (clientPlatform = 'web') => {

    // validate the client platform
    if (!['web', 'mobile'].includes(clientPlatform)) {
        throw new Error('Invalid client platform');
    }

    // select the return URL for the client platform
    const returnUrl =
        clientPlatform === 'mobile'
            ? process.env.MOBILE_PAYMENT_RETURN_URL
            : process.env.WEB_PAYMENT_RETURN_URL;

    // validate the payment return URL
    if (!returnUrl) {
        throw new Error(
            'Payment return URL is not configured'
        );
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
        !['http:', 'https:'].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname
    ) {
        throw new Error('Invalid HarrenaPay base URL');
    }

    // return the configured provider base URL
    return baseUrl;
};

// initiate escrow funding with HarrenaPay
const initiateHarrenaPayEscrow = async (
    payment,
    facility,
    returnUrl
) => {

    const apiKey = process.env.HARRENAPAY_API_KEY;

    const baseUrl = getHarrenaPayBaseUrl();

    if (!apiKey) {
        throw new Error('HarrenaPay API key is not configured');
    }

    // validate the payment return URL
    if (!returnUrl) {
        throw new Error(
            'Payment return URL is not configured'
        );
    }

    const validatedReturnUrl = new URL(returnUrl);

    if (validatedReturnUrl.protocol !== 'https:') {
        throw new Error(
            'A valid HTTPS payment return URL must be configured'
        );
    }

    // find the user account belonging to the facility
    const facilityUser = await User.findById(facility.user)
        .select('email');

    if (!facilityUser || !facilityUser.email) {
        throw new Error(
            'Facility user email could not be found'
        );
    }

    // prepare the escrow request
    const requestBody = {
        reference: payment.providerReference,
        amount: payment.amountKobo,
        currency: 'NGN',
        customer_email: facilityUser.email,
        customer_name: facility.facilityName,
        description: `CAREPORIUM shift funding - ${payment.shift}`,
        return_url: returnUrl,
        release_window_hours: 168
    };

    // create the escrow with HarrenaPay
    const response = await fetch(
        `${baseUrl}/escrow/initiate`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }
    );

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            responseData.message ||
            responseData.error ||
            'Unable to initiate HarrenaPay escrow'
        );

        error.statusCode = response.status;

        throw error;
    }

    // save the escrow details returned by HarrenaPay
    payment.providerEscrowId = responseData.escrow_id;
    payment.checkoutUrl = responseData.checkout_url;

    payment.virtualAccountNumber =
        responseData.account_number ||
        responseData.virtual_account_number;

    payment.bankName = responseData.bank_name;

    payment.expiresAt = responseData.expires_at
        ? new Date(responseData.expires_at)
        : undefined;

    // keep the funding status pending until a verified webhook confirms payment
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

    if (
        !['mock', 'harrenapay'].includes(paymentProvider)
    ) {
        throw new Error('Unsupported payment provider');
    }

    // validate the client platform
    if (!['web', 'mobile'].includes(clientPlatform)) {
        throw new Error('Invalid client platform');
    }

    // mock payments must never be used in production
    if (
        process.env.NODE_ENV === 'production' &&
        paymentProvider === 'mock'
    ) {
        throw new Error(
            'Mock payments are disabled in production'
        );
    }

    // select and validate the payment return URL for HarrenaPay
    let returnUrl;

    if (paymentProvider === 'harrenapay') {
        returnUrl = getPaymentReturnUrl(clientPlatform);
    }

    // calculate the shift funding amount and platform commission
    const {
        workerPayoutAmountKobo,
        platformCommissionAmountKobo,
        amountKobo
    } = calculatePaymentAmounts(
        payRate,
        professionalsNeeded
    );

    // create a unique reference for this shift payment
    const providerReference =
        `careporium_shift_${shift._id}`;

    // create the pending payment record
    const payment = await Payment.create({
        shift: shift._id,
        facility: facility._id,
        amountKobo,
        commissionRateBps: 1000,
        platformCommissionAmountKobo,
        workerPayoutAmountKobo,
        provider: paymentProvider,
        providerReference,
        clientPlatform,
        fundingStatus: 'pending',
        completionStatus: 'pending',
        payoutStatus: 'not_ready',
        disputeStatus: 'none'
    });

    // initiate escrow only when HarrenaPay is selected
    if (paymentProvider === 'harrenapay') {
        try {
            return await initiateHarrenaPayEscrow(
                payment,
                facility,
                returnUrl
            );

        } catch (error) {

            // preserve the payment record so funding can be retried
            // the same provider reference must be reused for retries
            payment.fundingStatus = 'failed';

            await payment.save();

            throw error;
        }
    }

    return payment;
};

// retry funding for an existing shift payment
const retryShiftPayment = async ({ shift, facility }) => {

    // find the existing payment record for this shift
    const payment = await Payment.findOne({
        shift: shift._id,
        facility: facility._id
    });

    if (!payment) {
        throw new Error(
            'Payment record not found for this shift'
        );
    }

    // prevent retrying payment for a shift that is no longer awaiting payment
    if (shift.status !== 'pending_payment') {
        throw new Error(
            'This shift is no longer awaiting payment'
        );
    }

    // prevent creating another payment after funding has succeeded
    if (payment.fundingStatus === 'funded') {
        return payment;
    }

    // ensure the retry uses the same payment provider
    if (payment.provider !== 'harrenapay') {
        throw new Error(
            'Payment retry is only available for HarrenaPay payments'
        );
    }

    // select the original payment return URL
    const returnUrl = getPaymentReturnUrl(
        payment.clientPlatform || 'web'
    );

    // reuse the existing payment reference when retrying escrow initiation
    try {
        payment.fundingStatus = 'pending';

        await payment.save();

        // initiate escrow using the existing payment record and reference
        return await initiateHarrenaPayEscrow(
            payment,
            facility,
            returnUrl
        );

    } catch (error) {

        // preserve the payment record so another retry is possible
        payment.fundingStatus = 'failed';

        await payment.save();

        throw error;
    }
};

// simulate payment only while developing locally
const simulateMockPayment = async (paymentId) => {

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Mock payments are disabled in production'
        );
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.provider !== 'mock') {
        throw new Error(
            'Mock payment simulation cannot be used for this provider'
        );
    }

    // mark the mock payment as funded
    payment.fundingStatus = 'funded';
    payment.fundedAt = new Date();

    await payment.save();

    // publish the shift only after funding succeeds
    await Shift.findOneAndUpdate(
        {
            _id: payment.shift,
            status: 'pending_payment'
        },
        {
            status: 'open'
        }
    );

    return payment;
};

// retrieve payment status from HarrenaPay
const getPaymentStatus = async (providerReference) => {

    const payment = await Payment.findOne({
        providerReference
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.provider !== 'harrenapay') {
        throw new Error(
            'Payment status lookup is only available for HarrenaPay payments'
        );
    }

    const apiKey = process.env.HARRENAPAY_API_KEY;

    const baseUrl = getHarrenaPayBaseUrl();

    if (!apiKey) {
        throw new Error('HarrenaPay API key is not configured');
    }

    // retrieve the escrow status from HarrenaPay
    const response = await fetch(
        `${baseUrl}/escrow/${encodeURIComponent(providerReference)}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        }
    );

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            responseData.message ||
            responseData.error ||
            'Unable to retrieve HarrenaPay payment status'
        );
    }

    // return the provider response for server-side verification
    return responseData;
};

// handles HarrenaPay webhook events
const handleHarrenaPayWebhook = async (event) => {

    const {
        event: eventType,
        reference,
        amount,
        currency
    } = event;

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
            processed: false
        };
    }

    const payment = await Payment.findOne({
        providerReference: reference,
        provider: 'harrenapay'
    });

    if (!payment) {
        throw new Error('Payment record not found for webhook reference');
    }

    // validate monetary details when the provider includes them
    if (amount !== undefined && Number(amount) !== payment.amountKobo) {
        throw new Error('Webhook amount does not match payment record');
    }

    if (currency !== undefined && currency !== payment.currency) {
        throw new Error('Webhook currency does not match payment record');
    }

    // handle successful funding
    if (
        eventType === 'escrow.funded' ||
        eventType === 'payment.success'
    ) {

        if (
            payment.fundingStatus === 'refunded' ||
            payment.fundingStatus === 'failed'
        ) {
            return {
                received: true,
                processed: false
            };
        }

        if (payment.fundingStatus !== 'funded') {
            payment.fundingStatus = 'funded';
            payment.fundedAt = new Date();
        }

        payment.providerEscrowStatus = 'funded';

        await payment.save();

        await Shift.findOneAndUpdate(
            {
                _id: payment.shift,
                status: 'pending_payment'
            },
            {
                $set: {
                    status: 'open'
                }
            }
        );

        return {
            received: true,
            processed: true
        };
    }

    // handle failed funding
    if (eventType === 'payment.failed') {

        if (
            payment.fundingStatus === 'funded' ||
            payment.fundingStatus === 'refunded'
        ) {
            return {
                received: true,
                processed: false
            };
        }

        payment.fundingStatus = 'failed';
        payment.providerEscrowStatus = 'failed';

        await payment.save();

        return {
            received: true,
            processed: true
        };
    }

    // handle seller acceptance
    if (eventType === 'escrow.accepted') {
        payment.providerEscrowStatus = 'accepted';
    }

    // handle delivery confirmation at provider level
    if (eventType === 'escrow.delivered') {
        payment.providerEscrowStatus = 'delivered';
    }

    // provider releasing escrow does not by itself confirm worker payout
    if (eventType === 'escrow.released') {
        payment.providerEscrowStatus = 'released';
    }

    // handle provider refund
    if (eventType === 'escrow.refunded') {
        payment.providerEscrowStatus = 'refunded';
        payment.fundingStatus = 'refunded';
        payment.payoutStatus = 'on_hold';
    }

    // handle disputes
    if (eventType === 'dispute.opened') {
        payment.providerEscrowStatus = 'disputed';
        payment.disputeStatus = 'open';
        payment.payoutStatus = 'on_hold';
    }

    // handle seller declining an escrow invitation
    if (eventType === 'escrow.declined') {
        payment.providerEscrowStatus = 'declined';
        payment.payoutStatus = 'on_hold';
    }

    await payment.save();

    return {
        received: true,
        processed: true
    };
};

export default {
    createPendingPayment,
    retryShiftPayment,
    simulateMockPayment,
    getPaymentStatus,
    handleHarrenaPayWebhook
};