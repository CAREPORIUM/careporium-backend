import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  fetchNotifications,
  readNotification,
  readAllNotifications,
} from "../controllers/notificationController.js";
const router = express.Router();

router.use(authMiddleware);

router.get("/my-notifications", fetchNotifications);
router.get("/all-my notifications", fetchNotifications);
router.patch("/read-all", readAllNotifications);
router.patch("/read/:notificationId", readNotification);


export default router;