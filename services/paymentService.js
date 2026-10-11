
import Payment from "../models/paymentModel.js";
import Shift from "../models/shiftModel.js";

// CAREPORIUM commission is 10%
const COMMISSION_RATE_BPS = 1000;

// calculate the funding amount for a shift
const calculateFundingAmounts = (payRate, professionalsNeeded) => {

    // validate the worker's pay and number of professionals required
    if (
        !Number.isFinite(Number(payRate)) ||
        Number(payRate) <= 0
    ) {
        throw new Error("Pay rate must be greater than zero");
    }

    if (
        !Number.isInteger(Number(professionalsNeeded)) ||
        Number(professionalsNeeded) < 1
    ) {
        throw new Error("Professionals needed must be at least one");
    }

    // convert the amount per worker from naira to kobo
    const payRateKobo = Math.round(Number(payRate) * 100);

    // calculate the total amount required to pay all workers
    const workerBudgetKobo =
        payRateKobo * Number(professionalsNeeded);

    if (!Number.isSafeInteger(workerBudgetKobo)) {
        throw new Error("Shift funding amount is too large");
    }

    // calculate CAREPORIUM's 10% commission
    const platformCommissionAmountKobo = Math.round(
        workerBudgetKobo * COMMISSION_RATE_BPS / 10000
    );

    // calculate the total amount the facility must fund
    const totalAmountKobo =
        workerBudgetKobo + platformCommissionAmountKobo;

    return {
        workerBudgetKobo,
        platformCommissionAmountKobo,
        totalAmountKobo
    };
};


// create a pending payment record for a shift
const createPendingPayment = async ({
    shift,
    facility,
    payRate,
    professionalsNeeded
}) => {

    // calculate the required funding amount
    const {
        workerBudgetKobo,
        platformCommissionAmountKobo,
        totalAmountKobo
    } = calculateFundingAmounts(payRate, professionalsNeeded);

    // create the payment record linked to the shift
    const payment = await Payment.create({
        shift: shift._id,
        facility: facility._id,
        amountKobo: totalAmountKobo,
        currency: "NGN",
        commissionRateBps: COMMISSION_RATE_BPS,
        platformCommissionAmountKobo,
        workerPayoutAmountKobo: workerBudgetKobo,
        provider: process.env.PAYMENT_PROVIDER || "mock",
        fundingStatus: "pending",
        completionStatus: "pending",
        payoutStatus: "not_ready",
        disputeStatus: "none"
    });

    return payment;
};


// simulate a payment result during development only
const simulateMockPayment = async (paymentId) => {

    // mock payments must never be used in production
    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "Mock payments are disabled in production"
        );
    }

    if ((process.env.PAYMENT_PROVIDER || "mock") !== "mock") {
        throw new Error(
            "Mock payment simulation is not enabled"
        );
    }

    // select success, failure, or pending through environment settings
    const mockResult = process.env.MOCK_PAYMENT_RESULT || "pending";

    if (!["success", "failed", "pending"].includes(mockResult)) {
        throw new Error(
            "MOCK_PAYMENT_RESULT must be success, failed, or pending"
        );
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error("Payment record not found");
    }

    // do not process a payment that has already been resolved
    if (payment.fundingStatus !== "pending") {
        return payment;
    }

    // leave the payment pending while awaiting confirmation
    if (mockResult === "pending") {
        return payment;
    }

    // retrieve the shift linked to the payment
    const shift = await Shift.findById(payment.shift);

    if (!shift) {
        throw new Error("Shift linked to this payment was not found");
    }

    // record a simulated funding failure
    if (mockResult === "failed") {
        payment.fundingStatus = "failed";

        await payment.save();

        // keep the shift unpublished
        shift.status = "pending_payment";

        await shift.save();

        return payment;
    }

    // mark the payment as funded only in the development simulation
    payment.fundingStatus = "funded";
    payment.fundedAt = new Date();

    await payment.save();

    // publish the shift after simulated funding succeeds
    shift.status = "open";

    await shift.save();

    return payment;
};


export default {
    calculateFundingAmounts,
    createPendingPayment,
    simulateMockPayment
};