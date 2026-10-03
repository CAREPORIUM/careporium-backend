import express from 'express'
import upload from '../config/multer.js'
import { registerWorkerController, registerFacilityController, verifyAccountController, resendVerificationOtpController, 
         loginUserController, getProfileController, deleteUserController } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()


router.post('/register/worker', registerWorkerController);
router.post('/register/facility', upload.fields([ { name: 'businessRegCert', maxCount: 1 }, { name: 'facilityLicense', maxCount: 1 },
            { name: 'taxID', maxCount: 1 } ]), registerFacilityController)
router.post('/verify-account', verifyAccountController);
router.post('/resend-otp', resendVerificationOtpController);
/**
 * @swagger
 * /api/auth/v1/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: worker@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid email or password
 */
router.post('/login', loginUserController);
router.get('/get-profile/:userId', authMiddleware, getProfileController);
router.delete('/delete-profile/:userId', deleteUserController)

export default router;
router.post("/register/worker", registerWorkerController);
router.post("/login", loginWorkerController);
router.get("/getprofile", authMiddleware, getProfile);
router.put("/updateprofile", authMiddleware, updateProfile);
router.post("/register/facility", registerFacilityController);
export default router;
router.post('/register/worker', registerWorkerController);
router.post('/login', loginWorkerController);
router.get('/get-profile', authMiddleware, getProfile);
router.put('/update-profile', authMiddleware, updateProfile);

export default router;
