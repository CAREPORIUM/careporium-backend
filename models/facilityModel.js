import mongoose from 'mongoose'

const facilitySchema = new mongoose.Schema(
{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    facilityName: { type: String, required: true },
    facilityType: { type: String, required: true },
    taxID: { type: String, required: true },
    businessEmail: { type: String, required: true },
    adminName: { type: String, required: true },
    phoneNumber: { type: String, required: true }
}, { timestamps: true }
)

export default facilitySchema;