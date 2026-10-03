import express from 'express'
import upload from '../config/multer.js'
import { getFProfile, updateFProfile } from '../controllers/facilityController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
const router = express.Router()

router.get('/get-facility-profile', authMiddleware, getFProfile);
router.put('/update-facility-profile', authMiddleware, updateFProfile);

export default router;