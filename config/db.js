import mongoose from "mongoose";

// Establishes the MongoDB connection used by the whole app.
// Reads the URI from MONGODB_URI (preferred) or MONGO_URI, and fails soft:
// if no URI is set it logs a warning and returns instead of crashing, so the
// server can still start for non-database work (e.g. health checks).
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MongoDB connection skipped: set MONGODB_URI or MONGO_URI in an .env file.");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB failed to connect:", error.message);
  }
};

export default connectDB;
