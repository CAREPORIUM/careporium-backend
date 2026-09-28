import express from "express";
import {
  registerWorkerController,
  loginWorkerController,
  registerFacilityController,
} from "../controllers/authController.js";
import { getProfile, updateProfile } from "../controllers/workerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register/worker", registerWorkerController);
router.post("/login", loginWorkerController);
router.get("/getprofile", authMiddleware, getProfile);
router.put("/updateprofile", authMiddleware, updateProfile);
router.post("/register/facility", registerFacilityController);
export default router;
