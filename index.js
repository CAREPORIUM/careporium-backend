import dns from "dns"
dns.setServers(["8.8.8.8", "1.1.1.1"])

import express from "express"
import "dotenv/config"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import shiftRoutes from "./routes/shiftRoutes.js"
import connectDB from "./config/db.js"
import workerRoutes from "./routes/workerRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from "./routes/authRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const PORT = process.env.PORT || 8089;

const app = express();

app.use(helmet());

const allowedOrigins = [
    process.env.FRONTEND_LOCAL_URL,
    process.env.FRONTEND_PROD_URL,
    'http://127.0.0.1:5500',
    'http://localhost:8089',
    'https://careporium-backend.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // allow requests without an origin, such as Postman or server-to-server requests
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// limits repeated requests to authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

// for swagger test route and doc
app.get("/swagger-test", (req, res) => {
    res.json({
        message: "Swagger route area is working"
    });
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// routes
app.use("/api/auth/v1", authRoutes);
app.use("/api/worker/v1", workerRoutes);
app.use("/api/facility/v1", facilityRoutes);
app.use("/api/shifts/v1", shiftRoutes);
app.use("/api/applications/v1", applicationRoutes);
app.use("/api/admin/v1", adminRoutes);
app.use("/api/attendance/v1", attendanceRoutes);

// handles requests to unknown routes 
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "Not found"
    });
});

// global error handling
app.use((err, req, res, next) => {

    // pass errors onward if the response has already started
    if (res.headersSent) {
        return next(err);
    }

    // log the error for debugging
    console.error(err);

    // handle invalid JSON in request body
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON request body"
        });
    }

    // handle CORS errors
    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            success: false,
            message: "Origin not allowed"
        });
    }

    // handle known client errors
    const statusCode = err.statusCode || err.status;

    if (
        Number.isInteger(statusCode) &&
        statusCode >= 400 &&
        statusCode < 500
    ) {
        return res.status(statusCode).json({
            success: false,
            message: err.expose ? err.message : "Request failed"
        });
    }

    // handle unexpected server errors
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});


// connect to MongoDB before accepting requests
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();