import express from 'express'
import upload from '../config/multer.js'
import { registerWorkerController, registerFacilityController, verifyAccountController, resendVerificationOtpController,
         loginUserController, deleteUserController } from '../controllers/authController.js'
import { getWProfile, updateWProfile } from '../controllers/workerController.js'
import { getFProfile, updateFProfile } from '../controllers/facilityController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
const router = express.Router()


// --- Public authentication endpoints (no token required) ---

// POST /register/worker — create a new worker account.
router.post('/register/worker', registerWorkerController);

// POST /register/facility — create a new facility account. Accepts three
// uploaded documents (businessRegCert, facilityLicense, TaxID) via multer.
router.post('/register/facility',upload.fields([ { name: 'businessRegCert', maxCount: 1 }, { name: 'facilityLicense', maxCount: 1 },
            { name: 'TaxID', maxCount: 1 } ]), registerFacilityController )

// POST /verify-account — verify an account with the emailed OTP code.
router.post('/verify-account', verifyAccountController);

// POST /resend-otp — resend the verification OTP to the user's email.
router.post('/resend-otp', resendVerificationOtpController);

// POST /login — authenticate and receive a JWT.
router.post('/login', loginUserController);

// --- Authenticated profile endpoints (valid token required) ---

// GET /get-worker-profile — fetch the signed-in worker's profile.
router.get('/get-worker-profile', authMiddleware, getWProfile);

// PUT /update-worker-profile/:userId — update the signed-in worker's profile.
router.put('/update-worker-profile/:userId', authMiddleware, updateWProfile);

// GET /get-profile — fetch the signed-in facility's profile.
router.get('/get-profile', authMiddleware, getFProfile);

// PUT /update-profile/:userId — update the signed-in facility's profile.
router.put('/update-profile/:userId', authMiddleware, updateFProfile);

// DELETE /delete-profile/:userId — delete a user account and its profile.
router.delete('/delete-profile/:userId', deleteUserController);

export default router;