import express from 'express';  
import { registerWorkerController, loginWorkerController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register/worker', registerWorkerController);
router.post('/login', loginWorkerController);
router.get('/profile', authMiddleware, getWorkerProfile);

export default router;