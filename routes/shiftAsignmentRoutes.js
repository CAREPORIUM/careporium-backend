import express from "express";
import shiftAssignmentController from "../controllers/shiftAssignmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/:applicationId",
  authMiddleware,
  requireRole("facility"),
  shiftAssignmentController.createAssignment,
);

export default router;