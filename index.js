import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

connectDB();

const PORT = process.env.PORT || 8089;

const app = express();

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
