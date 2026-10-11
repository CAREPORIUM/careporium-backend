import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true
        },

        role: {
            type: String,
            required: true,
            trim: true
        },

        specialty: {
            type: String,
            trim: true
        },

        workType: {
            type: String,
            required: true,
            trim: true
        },

        responsibilities: {
            type: String,
            required: true,
            trim: true
        },

        requiredCredentials: {
            type: String,
            required: true,
            trim: true
        },

        professionalsNeeded: {
            type: Number,
            required: true,
            min: 1
        },

        minimumExperience: {
            type: Number,
            required: true,
            min: 0
        },

        arrivalInstructions: {
            type: String,
            trim: true
        },

        date: {
            type: Date,
            required: true
        },

        startTime: {
            type: String,
            required: true,
            trim: true
        },

        endTime: {
            type: String,
            required: true,
            trim: true
        },

        shiftType: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            address: {
                type: String,
                required: true,
                trim: true
            },

            city: {
                type: String,
                required: true,
                trim: true
            },

            state: {
                type: String,
                required: true,
                trim: true
            }
        },

        payRate: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["open", "filled", "closed"],
            default: "open"
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
        isUrgent: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Shift = mongoose.model("Shift", shiftSchema);

export default Shift;