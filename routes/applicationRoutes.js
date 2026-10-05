import express from "express";
import applicationController from "../controllers/applicationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();
//endpoint for worker to apply for a shift
router.post(
  "/apply/:shiftId",
  authMiddleware,
  requireRole("worker"),
  applicationController.applyForShift,
);
//endpoint for worker to get all their applications
router.get(
  "/my-applications",
  authMiddleware,
  requireRole("worker"),
  applicationController.getMyApplications,
);
//endpoint for facility to get all applications for their shifts
router.get(
  "/fetch-applications",
  authMiddleware,
  requireRole("facility"),
  applicationController.getApplicationsForFacility,
);
//facility can accept or reject an application for their shift ( hence the application status)
router.patch(
  "/applications/:applicationId/status",
  authMiddleware,
  requireRole("facility"),
  applicationController.updateApplicationStatus,
);

export default router;
