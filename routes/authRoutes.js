import express from 'express';  
import { registerWorkerController, loginWorkerController } from '../controllers/authController.js';

const router = express.router();

router.post('/register/worker', registerWorkerController);
router.post('/login', loginWorkerController);

export default router;