import express from 'express'
import upload from '../config/multer.js'
import { getFProfile, updateFProfile } from '../controllers/facilityController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/get-facility-profile', authMiddleware, getFProfile);

router.put('/update-facility-profile', authMiddleware, upload.fields([{ name: 'businessRegCert', maxCount: 1 },
           { name: 'facilityLicense', maxCount: 1 }, { name: 'taxID', maxCount: 1 }]), updateFProfile);

export default router;