import express from 'express'
import adminController from '../controllers/adminController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const router = express.Router();

router.get('/workers', authMiddleware, adminMiddleware, adminController.getWorkers);
router.get('/workers/:workerId', authMiddleware, adminMiddleware, adminController.getOneWorker);
router.patch('/workers/:workerId/documents', authMiddleware, adminMiddleware, adminController.updateWorkerDocStatus);
router.get('/facilities', authMiddleware, adminMiddleware, adminController.getFacilities);
router.get('/facilities/pending', authMiddleware, adminMiddleware, adminController.getPendingFacilities);
router.get('/facilities/:facilityId', authMiddleware, adminMiddleware, adminController.getOneFacility);
router.patch('/facilities/:facilityId/documents', authMiddleware, adminMiddleware, adminController.updateFacilityDocStatus);
router.patch('/facilities/:facilityId/verification', authMiddleware, adminMiddleware, adminController.updateFacilityStatus);

export default router;