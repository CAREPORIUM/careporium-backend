import express from 'express'
import upload from '../config/multer.js'
import { getWProfile, updateWProfile } from '../controllers/workerController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
const router = express.Router()

router.get('/get-worker-profile', authMiddleware, getWProfile);
router.put('/update-worker-profile', authMiddleware, upload.fields([ { name: 'professionalLicense', maxCount: 1 }, { name: 'idDocument', maxCount: 1 },
            { name: 'educationCert', maxCount: 1 }, { name: 'proofOfLocation', maxCount: 1 } ]), updateWProfile);

export default router;