import express from "express";
import { createShiftController, getShiftsController, getShiftByIdController, updateShiftController, 
        deleteShiftController } from "../controllers/shiftController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validateShift } from "../validators/shiftValidator.js";

const router = express.Router();

router.post("/create-shift", authMiddleware, requireRole("facility"), validateShift, createShiftController);
router.get("/get-shifts", getShiftsController);
router.get("/get-shift/:id",getShiftByIdController);
router.put("/update-shift/:id", authMiddleware, requireRole("facility"), updateShiftController );
router.delete("/delete-shift/:id", authMiddleware, requireRole("facility"), deleteShiftController);

export default router;