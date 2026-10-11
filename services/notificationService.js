import mongoose from "mongoose";
import Notification from "../models/notification.js";
import { getIO } from "../config/socket.js";

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  resourceType,
  resourceId,
}) => {
  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    resourceType,
    resourceId,
  });

  // Save first; live delivery failure should not undo the notification.
  try {
    getIO()
      .to(`user:${recipient}`)
      .emit("notification:new", notification);
  } catch (error) {
    console.error("Real-time notification delivery failed:", error);
  }

  return notification;
};

const getNotifications = async (userId, filter = "all") => {
  const query = { recipient: userId };

  if (filter === "unread") {
    query.isRead = false;
  }

  return Notification.find(query).sort({ createdAt: -1 });
};

const markNotificationAsRead = async (notificationId, userId) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    return null;
  }

  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    { isRead: true },
    { new: true, runValidators: true },
  );
};

const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true },
  );

  return result.modifiedCount;
};

export {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};