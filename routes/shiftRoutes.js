import express from "express";
import {
    createShiftController,
    getShiftsController,
    getShiftByIdController,
    updateShiftController,
    deleteShiftController
} from "../controllers/shiftController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validateShift } from "../middleware/shiftValidator.js";

const router = express.Router();

router.get(
    "/",
    getShiftsController
);
router.get(
    "/:id",
    getShiftByIdController
);
router.put(
    "/:id",
    authMiddleware,
    requireRole("facility"),
    updateShiftController
);
router.delete(
    "/:id",
    authMiddleware,
    requireRole("facility"),
    deleteShiftController
);
router.post(
    "/",
    authMiddleware,
    requireRole("facility"),
    validateShift,
    createShiftController
);


export default router;