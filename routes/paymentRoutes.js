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

export default router;