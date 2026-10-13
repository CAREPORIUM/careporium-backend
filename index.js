import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import "dotenv/config";
import cors from "cors";
import shiftRoutes from "./routes/shiftRoutes.js";
import connectDB from "./config/db.js";
import workerRoutes from "./routes/workerRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from "./routes/authRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

connectDB();

const PORT = process.env.PORT || 8089;

const app = express();

// Allow requests from the CAREPORIUM frontend
const allowedOrigins = [
    process.env.FRONTEND_LOCAL_URL,
    process.env.FRONTEND_PROD_URL,
    'http://localhost:8089',
    'https://careporium-backend.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests without an origin, such as Postman or server-to-server requests
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.get("/swagger-test", (req, res) => {
    res.json({
        message: "Swagger route area is working"
    });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Keep payment routes before express.json() for the HarrenaPay raw-body webhook
app.use("/api/payments/v1", paymentRoutes);

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
app.use("/api/worker/v1", workerRoutes);
app.use("/api/facility/v1", facilityRoutes);
app.use("/api/shifts/v1", shiftRoutes);
app.use("/api/applications/v1", applicationRoutes);
app.use("/api/admin/v1", adminRoutes);
app.use("/api/attendance/v1", attendanceRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});