import mongoose from "mongoose";

const shiftAssignmentSchema = new mongoose.Schema(
  {
    // Links the assignment to the application that resulted in the worker being selected.
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },

    // Identifies the worker who was selected for the shift.
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    // Identifies the shift the worker has been assigned to.
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },

    // Tracks the worker's progress through the actual shift lifecycle.
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

// A worker can only have one assignment for the same shift.
shiftAssignmentSchema.index(
  { worker: 1, shift: 1 },
  { unique: true },
);

const ShiftAssignment = mongoose.model(
  "ShiftAssignment",
  shiftAssignmentSchema,
);

export default ShiftAssignment;