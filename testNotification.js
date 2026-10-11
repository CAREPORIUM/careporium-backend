
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { createNotification } from "./services/notificationService.js";

const runTest = async () => {
  try {
    await connectDB();

    const recipientId = "6ac95514791ff53b5b4cabac";

    const notification = await createNotification({
      recipient: recipientId,
      type: "WELCOME",
      title: "Test Real-Time Notification",
      message: "Testing real-time notification delivery.",
    });

    console.log("Test notification created and emitted:");
    console.log(notification);
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

runTest();