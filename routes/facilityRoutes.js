import express from 'express'
import upload from '../config/multer.js'
import { getFProfile, updateFProfile, getFById } from '../controllers/facilityController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from "../middleware/roleMiddleware.js";


const router = express.Router()

router.get('/get-facility-profile', authMiddleware, getFProfile);

router.put('/update-facility-profile', authMiddleware, upload.fields([{ name: 'businessRegCert', maxCount: 1 },
           { name: 'facilityLicense', maxCount: 1 }, { name: 'taxID', maxCount: 1 }]), updateFProfile);
router.get('/get-facility-profile/:facilityId', authMiddleware, requireRole("worker"),getFById);
export default router;