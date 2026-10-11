import { truncate } from "fs/promises";
import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },

    profession: {
      type: String,
      required: true,
      trim: true,
    },

    specialty: {
      type: String,
      trim: true,
    },

    shiftDate: {
      type: String,
      required: true,
      trim: true,
    },

    shiftType: {
      type: String,
      required: true,
      trim: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    responsibilities: {
      type: String,
      required: true,
      trim: true,
    },

    reqCredentials: {
  type: String,
  required: true,
  trim: true,
},

    professionalsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },

    minimumExperience: {
      type: Number,
      required: true,
      min: 0,
    },

    arrivalInstructions: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    payRate: {
      type: Number,
      required: true,
      min: 0,
    },

    isUrgent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["open", "filled", "closed", "completed"],
      default: "open",
    },

    remindersSent: [
      {
        worker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Worker",
          required: true,
        },
        reminderType: {
          type: String,
          enum: ["24_hours", "2_hours"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    facilityRemindersSent: [
      {
        reminderType: {
          type: String,
          enum: ["24_hours", "2_hours"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    urgentRemindersSent: [
      {
        reminderType: {
          type: String,
          enum: ["urgent_unfilled"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    attendanceQrToken: {
      type: String,
      unique: true,
      sparse: true,
    },

    assignedWorkers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Worker",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Shift = mongoose.model("Shift", shiftSchema);

export default Shift;
