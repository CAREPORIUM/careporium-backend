import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    totalHoursWorked: { type: Number },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' }
}, {timestamps: true})

// ensures that a worker can only have one attendance record for a shift
attendanceSchema.index(
    { worker: 1, shift: 1},
    { unique: true }
)

const Attendance = mongoose.model("Attendance", attendanceSchema)

export default Attendance