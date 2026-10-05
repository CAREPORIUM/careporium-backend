import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    clockInTime: { type: Date, required: true },
    clockOutTime: { type: Date },
    totalHoursWorked: { type: Number },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' }
});