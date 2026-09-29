import express from "express";
import {
    loginController,
    registerFacilityController,
    registerWorkerController
} from "../controllers/authController.js";
import { getProfile, updateProfile } from "../controllers/workerController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register/worker", registerWorkerController);
router.post("/login", loginController);
router.post("/register/facility", registerFacilityController);
router.get("/getprofile", authenticate, getProfile);
router.put("/updateprofile", authenticate, updateProfile);

export default router;