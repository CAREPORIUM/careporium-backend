
import dns from "dns";

dns.setServers(["1.1.1.1"]);

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { startShiftReminderScheduler } from "./services/shiftReminderService.js";

import notificationRoutes from "./routes/notificationRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import shiftAssignmentRoutes from "./routes/shiftAsignmentRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

const PORT = process.env.PORT || 8089;

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Careporium API is running!",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is up and running!",
  });
});

app.use("/api/auth/v1", authRoutes);
app.use("/api/shifts/v1", shiftRoutes);
app.use("/api/assignments", shiftAssignmentRoutes);
app.use("/api/applications/v1", applicationRoutes);
app.use("/api/notifications/v1", notificationRoutes);

const startServer = async () => {
  try {
    // Connect to MongoDB before starting the application.
    await connectDB();

    // Initialize Socket.IO before accepting connections.
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);

      // Start reminders after the database and server are ready.
      startShiftReminderScheduler();
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
};

startServer();