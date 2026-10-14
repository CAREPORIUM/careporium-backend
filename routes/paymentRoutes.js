import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// receive HarrenaPay webhooks using the original raw request body
router.post(
    '/harrenapay/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleHarrenaPayWebhook
);

// retry funding for an existing shift
router.post(
    '/retry/:shiftId',
    authMiddleware,
    paymentController.retryShiftPayment
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

// simulate HarrenaPay sandbox funding
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