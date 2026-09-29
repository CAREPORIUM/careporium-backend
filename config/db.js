import mongoose from "mongoose";

const connectDB = async () =>{
    try{
        // Support both variable names used in the project's setup instructions.
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.warn("MongoDB URI is not configured; database routes will be unavailable.");
            return;
        }

        await mongoose.connect(mongoUri);
        console.log("MongoDB connected successfully!")
    }catch(error){
        console.error("MongoDB failed to connect:", error.message);
    }
};

export default connectDB;