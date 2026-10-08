import express from "express";
import applicationController from "../controllers/applicationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/apply/:shiftId", authMiddleware, requireRole("worker"), applicationController.applyForShift)
router.get("/my-applications", authMiddleware, requireRole("worker"), applicationController.getApplicationsForWorker);
router.get("/fetch-applications", authMiddleware, requireRole("facility"), applicationController.getApplicationsForFacility)
router.patch("/applications/:applicationId/status", authMiddleware, requireRole("facility"), applicationController.updateApplicationStatus);

export default router;
