import express from "express";
import { searchShifts } from "../controllers/shiftsController.js";

const router = express.Router();

router.get("/", searchShifts);

export default router;