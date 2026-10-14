// ---------------------------------------------------------------------------
// Careporium API — application entry point
// ---------------------------------------------------------------------------
// Responsibilities:
//   1. Load environment variables (.env) for configuration.
//   2. Connect to MongoDB.
//   3. Build the Express app: register middleware, mount routes, and add
//      global handlers (404 catch-all + error handler).
//   4. Start the HTTP server.
//
// Middleware/route ORDER matters (see the setup section below):
//   parsers -> routes -> 404 catch-all -> error handler.
// ---------------------------------------------------------------------------

import dns from "dns";
// Force Google/Cloudflare DNS so MongoDB Atlas (SRV) lookups work reliably
// even when the local network DNS blocks external SRV records.
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import shiftRoutes from "./routes/shiftRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

// Load environment variables from this worktree's .env. If no Mongo URI is
// found there, fall back to the sibling backend's .env so local development
// can share one database configuration.
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(projectDirectory, ".env") });
if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
  dotenv.config({ path: path.join(projectDirectory, "../careporium-backend/.env") });
}

// Establish the MongoDB connection before serving traffic.
connectDB();

// Port the server listens on (defaults to 8089 for local development).
const PORT = process.env.PORT || 8089;

const app = express();

// --- Global middleware (runs for every request) ---

// Enable Cross-Origin Resource Sharing so the frontend can call this API.
app.use(cors());
// Parse incoming JSON request bodies into req.body.
app.use(express.json());

// Simple health/status endpoints used to confirm the server is running.
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

// --- Route mounting: each feature lives under its own versioned base path ---

// Authentication: registration, login, OTP verification, profiles.
app.use("/api/auth/v1", authRoutes);
// Shifts: create/search/update/delete shifts and confirm completion.
app.use("/api/shifts/v1", shiftRoutes);
// Legacy generic shift ratings (single overall score + comment).
app.use("/api/ratings/v1", ratingRoutes);
// B6 reviews: role-specific reviews with per-category facility scores.
app.use("/api/reviews/v1", reviewRoutes);

// Catch-all 404 handler: placed after every valid route so it only runs for
// requests that no route handled.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Not found"
  });
});

// --- Global error handler (must be registered LAST) ---
// Express treats any middleware with four arguments as an error handler.
// It maps errors thrown in routes/services to an appropriate HTTP status.
app.use((error, req, res, next) => {
  console.error(error);
  const status = error.statusCode || (
    error.name === "ValidationError" || error.name === "CastError" ? 400 : 500
  );
  res.status(status).json({
    message: status < 500 ? error.message : "Internal server error"
  });
});

// Start the HTTP server once everything above is wired up.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
