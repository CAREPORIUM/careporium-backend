import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// receive Paystack webhooks using the original raw request body
router.post(
    '/paystack/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handlePaystackWebhook
);

// retry funding for an existing shift
router.post(
    '/retry/:shiftId',
    authMiddleware,
    paymentController.retryShiftPayment
);

// verify payment directly with Paystack
router.post(
    '/verify/:shiftId',
    authMiddleware,
    paymentController.verifyShiftPayment
);

// retrieve payment history
router.get(
    '/history',
    authMiddleware,
    paymentController.getPaymentHistory
);

// retrieve payment status for a shift
router.get(
    '/shift/:shiftId',
    authMiddleware,
    paymentController.getShiftPaymentStatus
);

// deprecated HarrenaPay sandbox funding endpoint
router.post(
    '/sandbox/fund/:shiftId',
    authMiddleware,
    paymentController.simulateSandboxFunding
);

// simulate a worker payout during development
router.post(
    '/sandbox/payout/:shiftId/:workerId',
    authMiddleware,
    paymentController.simulateWorkerPayout
);

export default router;