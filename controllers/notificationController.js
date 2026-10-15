import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService.js";

const formatNotification = (notification) => ({
  _id: notification._id,
  title: notification.title,
  text: notification.message,
  actionText: notification.actionText || "",
  actionLink: notification.actionLink || "",
  read: notification.isRead,
  createdAt: notification.createdAt,
});

const fetchNotifications = async (req, res, next) => {
  try {
   const filter =
  req.query.unread === "true" ? "unread" : req.query.filter || "all";

    if (!["all", "unread"].includes(filter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification filter",
      });
    }

    const notifications = await getNotifications(req.user.id, filter);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications.map(formatNotification),
      unreadCount: (
  await getNotifications(req.user.id, "unread")
).length,
    });
  } catch (error) {
    next(error);
  }
};

const readNotification = async (req, res, next) => {
  try {
    const notification = await markNotificationAsRead(
      req.params.notificationId,
      req.user.id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: formatNotification(notification),
    });
  } catch (error) {
    next(error);
  }
};

const readAllNotifications = async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};
export {
  fetchNotifications,
  readNotification,
  readAllNotifications,
  
};