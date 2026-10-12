
import dns from "dns";
dns.setServers(["1.1.1.1"]);

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";

import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { startShiftReminderScheduler } from "./services/shiftReminderService.js";
import swaggerSpec from "./config/swagger.js";

import authRoutes from "./routes/authRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import shiftAssignmentRoutes from "./routes/shiftAsignmentRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

const PORT = process.env.PORT || 8089;

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get("/swagger-test", (req, res) => {
  res.json({
    message: "Swagger route area is working",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.use("/api/worker/v1", workerRoutes);
app.use("/api/facility/v1", facilityRoutes);
app.use("/api/admin/v1", adminRoutes);
app.use("/api/shifts/v1", shiftRoutes);
app.use("/api/assignments/v1", shiftAssignmentRoutes);
app.use("/api/applications/v1", applicationRoutes);
app.use("/api/notifications/v1", notificationRoutes);
app.use("/api/attendance/v1", attendanceRoutes);
app.use("/api/feedback/v1", feedbackRoutes);

const startServer = async () => {
  try {
    await connectDB();

    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      startShiftReminderScheduler();
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
