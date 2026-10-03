import express from 'express'
import { getWorkers, getOneWorker, updateWorkerDocStatus,
        getFacilities, getOneFacility, updateFacilityDocStatus } from '../controllers/adminController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const router = express.Router();

router.get('/workers', authMiddleware, adminMiddleware, getWorkers);
router.get('/workers/:workerId', authMiddleware, adminMiddleware, getOneWorker);
router.patch('/workers/:workerId/documents', authMiddleware, adminMiddleware, updateWorkerDocStatus);
router.get('/facilities', authMiddleware, adminMiddleware, getFacilities);
router.get('/facilities/:facilityId', authMiddleware, adminMiddleware, getOneFacility);
router.patch('/facilities/:facilityId/documents', authMiddleware, adminMiddleware, updateFacilityDocStatus);

export default router;