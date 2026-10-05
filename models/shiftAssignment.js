import mongoose from "mongoose";

const shiftAssignmentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },

    status: {
      type: String,
      enum: ["assigned", "started", "completed"],
      default: "assigned",
    },
  },
  {
    timestamps: true,
  },
);

shiftAssignmentSchema.index(
  { worker: 1, shift: 1 },
  { unique: true },
);

const ShiftAssignment = mongoose.model(
  "ShiftAssignment",
  shiftAssignmentSchema,
);

export default ShiftAssignment;