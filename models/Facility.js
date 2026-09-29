import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    facilityName: { type: String, required: true, trim: true },
    facilityType: { type: String, required: true, trim: true },
    taxID: { type: String, required: true, trim: true },
    businessEmail: { type: String, required: true, lowercase: true, trim: true },
    adminName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true }
}, { timestamps: true });

export default mongoose.model("Facility", facilitySchema);