import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true
        },

        profession: {
            type: String,
            required: true,
            trim: true
        },

        specialty: {
            type: String,
            trim: true
        },

        shiftDate: {
            type: String,
            required: true,
            trim:true
        },    

        shiftType: {
            type: String,
            required: true,
            trim:true
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

        professionalsNeeded: {
            type: Number,
            required: true,
            min: 1
        },

        minimumExperience: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        responsibilities: {
            type: String,
            trim: true
        },

        reqCredentials:{
            type: String,
            trim: true
        },

        arrivalInstructions:{
            type: String,
            trim: true
        },

        payRate: {
            type: Number,
            required: true,
            min: 0
        },

        isUrgent: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: [
                "pending_payment",
                "open",
                "filled",
                "closed",
                "completed"
            ],
            default: "pending_payment"
        },

        attendanceQrToken: {
            type: String,
            unique: true,
            sparse: true // allows shifts to have no token without conflicting with 'unique' property
        },

        assignedWorkers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Worker"
        }],

    },
    {
        timestamps: true
    }
);

const Shift = mongoose.model("Shift", shiftSchema);

export default Shift;