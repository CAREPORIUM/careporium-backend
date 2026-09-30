import express from 'express'
import upload from '../config/multer.js'
import { registerWorkerController, registerFacilityController, verifyAccountController, resendVerificationOtpController, 
         loginUserController, deleteUserController } from '../controllers/authController.js'
import { getWProfile, updateWProfile } from '../controllers/workerController.js'
import { getFProfile, updateFProfile } from '../controllers/facilityController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
const router = express.Router()


router.post('/register/worker', registerWorkerController);
router.post('/register/facility',upload.fields([ { name: 'businessRegCert', maxCount: 1 }, { name: 'facilityLicense', maxCount: 1 },
            { name: 'TaxID', maxCount: 1 } ]), registerFacilityController )
router.post('/verify-account', verifyAccountController);
router.post('/resend-otp', resendVerificationOtpController);
router.post('/login', loginUserController);
router.get('/get-worker-profile', authMiddleware, getWProfile);
router.put('/update-facility-profile/:userId', authMiddleware, updateWProfile);
router.get('/get-profile', authMiddleware, getFProfile);
router.put('/update-profile/:userId', authMiddleware, updateFProfile);
router.delete('/delete-profile/:userId', deleteUserController);

export default router;