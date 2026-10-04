import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
    facility: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
        required: true,
    },
    role: { type: String, required: true, trim: true },
    specialty: { type: String, trim: true },
    workType: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requirements: { type: String, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    shiftType: { type: String, required: true, trim: true },
    location: {
        address: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
    },
    payRate: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["open", "filled", "closed"], default: "open" },
    isUrgent: { type: Boolean, default: false },
}, { timestamps: true });

shiftSchema.index({ status: 1, date: 1 });
shiftSchema.index({ role: 1, specialty: 1, shiftType: 1 });
shiftSchema.index({ payRate: 1 });

const Shift = mongoose.models.Shift || mongoose.model("Shift", shiftSchema);

export default Shift;