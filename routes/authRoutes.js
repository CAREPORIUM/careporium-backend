import express from 'express';
import upload from '../config/multer.js';
import { registerWorkerController, registerFacilityController, verifyAccountController, resendVerificationOtpController,
         loginUserController, logoutUserController, getProfileController, forgotPasswordController, verifyResetCodeController,
         resendResetCodeController, resetPasswordController, deleteUserController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register/worker', registerWorkerController);
router.post('/register/facility', registerFacilityController);
router.post('/verify-account', verifyAccountController);
router.post('/resend-otp', resendVerificationOtpController);
router.post('/login', loginUserController);
router.post('/logout', authMiddleware, logoutUserController);
router.get('/get-profile/:userId', authMiddleware, getProfileController);
router.post('/forgot-password', forgotPasswordController);
router.post('/verify-reset-code', verifyResetCodeController);
router.post('/resend-reset-code', resendResetCodeController);
router.post('/reset-password', resetPasswordController);
router.delete('/delete-profile/:userId', authMiddleware, deleteUserController);

export default router;