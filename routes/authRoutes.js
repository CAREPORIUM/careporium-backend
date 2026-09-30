import express from 'express'
import upload from '../config/multer.js'

import {
    registerWorkerController,
    registerFacilityController,
    verifyAccountController,
    resendVerificationOtpController,
    loginUserController,
    deleteUserController
} from '../controllers/authController.js'

import { getProfile, updateProfile } from '../controllers/workerController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

// worker registration
router.post('/register/worker', registerWorkerController);

// facility registration with document uploads
router.post('/register/facility',upload.fields([
        { name: 'businessRegCert', maxCount: 1 },
        { name: 'facilityLicense', maxCount: 1 },
        { name: 'TaxID', maxCount: 1 } ]), registerFacilityController
)

// account verification
router.post('/verify-account', verifyAccountController);

// resend verification OTP
router.post('/resend-otp', resendVerificationOtpController);

// login
router.post('/login', loginUserController);

// get profile
router.get('/get-profile', authMiddleware, getProfile);

// update profile
router.put('/update-profile', authMiddleware, updateProfile);

// delete user
router.delete('/delete-profile/:userId', deleteUserController);

export default router;