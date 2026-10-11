import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  fetchNotifications,
  readNotification,
  readAllNotifications,
} from "../controllers/notificationController.js";
const router = express.Router();

router.use(authMiddleware);


router.get("/", fetchNotifications);
router.patch("/read-all", readAllNotifications);
router.patch("/:notificationId/read", readNotification);


export default router;