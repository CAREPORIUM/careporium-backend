import express from 'express';

import payoutController from '../controllers/payoutController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';

import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.post(
    '/process',
    authMiddleware,
    adminMiddleware,
    payoutController.processWorkerPayout
);

router.post(
    '/verify',
    authMiddleware,
    adminMiddleware,
    payoutController.verifyWorkerPayout
);

router.get(
    '/history',
    authMiddleware,
    payoutController.getPaymentHistory
);

export default router;