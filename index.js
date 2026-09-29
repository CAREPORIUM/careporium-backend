import express from "express";
import 'dotenv/config';
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";

connectDB();

const PORT = process.env.PORT || 8089; 

const app = express();

app.use(cors());
app.use(express.json());

// Keep profile-related endpoints grouped under one API prefix.
app.use("/api/professionals", professionalRoutes);
app.use("/api/auth/v1", authRoutes);

app.get("/", (req, res) =>{
    res.json({
        message: "Careporium API is running!"
    });
});

app.get("/health", (req, res) =>{
    res.json({
        status: "OK",
        message: "Server is up and running!"
    });
});

// Return consistent JSON for requests that do not match a route.
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Convert route and database errors into safe JSON responses.
app.use((error, req, res, next) => {
    console.error(error);
    const status = error.statusCode || (
        error.name === "ValidationError" || error.name === "CastError" ? 400 : 500
    );
    res.status(status).json({
        message: status < 500 ? error.message : "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});