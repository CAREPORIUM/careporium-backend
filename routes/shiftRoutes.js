import express from "express";
import shiftController from "../controllers/shiftController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
//import { validateShift } from "../validators/shiftValidator.js";

const router = express.Router();

router.post("/create-shift", authMiddleware, requireRole("facility"), shiftController.createShift)
router.get("/get-shifts", authMiddleware, requireRole("worker"), shiftController.getAllShifts)
router.get("/get-shift/:shiftId", authMiddleware, shiftController.getShiftById)
router.get("/my-shifts", authMiddleware, requireRole("facility"), shiftController.getShiftsForFacility)
router.put("/update-shift/:shiftId", authMiddleware, requireRole("facility"), shiftController.updateShift)
router.patch("/close-shift/:shiftId", authMiddleware, requireRole("facility"), shiftController.closeShift)
router.patch("/complete-shift/:shiftId", authMiddleware, requireRole("facility"), shiftController.completeShift)
router.delete("/delete-shift/:id", authMiddleware, requireRole("facility"), shiftController.deleteShift);

export default router;