import express from 'express';  
import { registerWorkerController, loginWorkerController } from '../controllers/authController.js';
import { getProfile, updateProfile } from '../controllers/workerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register/worker', registerWorkerController);
router.post('/login', loginWorkerController);
router.get('/get-profile', authMiddleware, getProfile);
router.put('/update-profile', authMiddleware, updateProfile);

export default router;