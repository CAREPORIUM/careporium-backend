import express from 'express';

import disputeController from '../controllers/disputeController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = express.Router();

// workers and facilities can raise disputes
router.post('/raise-dispute', authMiddleware, disputeController.createDispute);

// retrieve a specific dispute
router.get('get-dispute/:disputeId', authMiddleware, disputeController.getDisputeById);

// admins can retrieve all disputes for review
router.get('/get-all-disputes', authMiddleware, adminMiddleware, disputeController.getAllDisputes);

export default router;