import express from "express";
import attendanceController from "../controllers/attendanceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/shifts/:shiftId/qr", authMiddleware, requireRole("facility"), attendanceController.getQrCode)
router.post("/clock-in", authMiddleware, requireRole("worker"), attendanceController.workerClockIn);
router.post("/clock-out", authMiddleware, requireRole("worker"), attendanceController.workerClockOut);

export default router;