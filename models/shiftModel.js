import mongoose from "mongoose";

// Mongoose schema for a Shift. A shift is a job posting created by a facility
// that a worker can be assigned to. Key lifecycle fields:
//   status: open -> filled/in_progress -> completed (or closed/cancelled).
//   assignedWorker: set when the facility accepts an applicant.
//   worker/facilityCompletionConfirmed: each side independently confirms the
//     work is done; both must be true (plus status "completed") before the
//     shift can be reviewed in the ratings/reviews feature.
//   completedAt: timestamp of completion, used to enforce the 14-day review window.
const shiftSchema = new mongoose.Schema(
    {
        // The facility that created/owns this shift.
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true
        },

        // Populated by the shift acceptance workflow; ratings use it to identify the worker.
        assignedWorker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Worker",
            default: null
        },

        // Job role being hired for (required).
        role: {
            type: String,
            required: true,
            trim: true
        },

        // Optional specialty within the role.
        specialty: {
            type: String,
            trim: true
        },

        // Broad category of work (required).
        workType: {
            type: String,
            required: true,
            trim: true
        },

        // Free-text description of the shift (required).
        description: {
            type: String,
            required: true,
            trim: true
        },

        // Optional requirements/qualifications for applicants.
        requirements: {
            type: String,
            trim: true
        },

        // Date the shift takes place (required).
        date: {
            type: Date,
            required: true
        },

        // Shift start time as a string, e.g. "09:00" (required).
        startTime: {
            type: String,
            required: true,
            trim: true
        },

        // Shift end time as a string, e.g. "17:00" (required).
        endTime: {
            type: String,
            required: true,
            trim: true
        },

        // Type of shift, e.g. "day" / "night" (required).
        shiftType: {
            type: String,
            required: true,
            trim:true
        },

        // Where the shift takes place.
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

        // Hourly/flat pay rate for the shift (required, non-negative).
        payRate: {
            type: Number,
            required: true,
            min: 0
        },

        // Lifecycle status of the shift. Defaults to "open" when first posted.
        status: {
            type: String,
            enum: ["open", "filled", "in_progress", "completed", "closed"],
            default: "open"
        },

        // These confirmations gate shift completion and therefore rating eligibility.
        workerCompletionConfirmed: {
            type: Boolean,
            default: false
        },

        facilityCompletionConfirmed: {
            type: Boolean,
            default: false
        },

        // When the shift was marked complete; used by the reviews feature.
        completedAt: {
            type: Date,
            default: null
        },

        // Flags the shift as needing urgent cover.
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