import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Shift from "./models/shiftModel.js";
import Notification from "./models/notification.js";
import { sendShiftReminders } from "./services/shiftReminderService.js";

const shiftId = process.argv[2];

const runTest = async () => {
  dns.setServers(["1.1.1.1"]);

  if (!shiftId) {
    throw new Error(
      "Provide a shift ID: node testShiftReminder.js YOUR_SHIFT_ID"
    );
  }

  await connectDB();

  // Keep the rest of your existing test code here.
   const shift = await Shift.findById(shiftId);

  if (!shift) {
    throw new Error("Test shift not found.");
  }

  const [hours, minutes] = shift.startTime.split(":").map(Number);
  const shiftStartsAt = new Date(shift.date);
  shiftStartsAt.setHours(hours, minutes, 0, 0);

  // Simulate a time when the 24-hour reminder is due.
  const simulatedNow =
  shiftStartsAt.getTime() - 2 * 60 * 60 * 1000 + 30_000;

  const before = await Notification.countDocuments({
    type: "SHIFT_STARTING_SOON",
    resourceId: shift._id,
    title: "Your shift starts in 2 hours",
  });

  await sendShiftReminders({ now: simulatedNow, shiftId });
  await sendShiftReminders({ now: simulatedNow, shiftId });

const savedShift = await Shift.findById(shiftId).select("remindersSent");

console.log(
  "Reminder records saved on shift:",
  savedShift?.remindersSent
);

  const after = await Notification.countDocuments({
    type: "SHIFT_STARTING_SOON",
    resourceId: shift._id,
    title: "Your shift is tomorrow",
  });

  console.log({
    shiftId,
    notificationsBefore: before,
    notificationsAfter: after,
    newNotifications: after - before,
  });
};

runTest()
  .catch((error) => {
    console.error("Reminder test failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

 