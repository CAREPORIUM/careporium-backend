import mongoose from 'mongoose';

// Mongoose schema for a Worker profile. Linked one-to-one with a User account
// via the `user` field. Holds the professional details a facility sees when
// reviewing applicants, plus optional certifications.
// NOTE: `state` is restricted to the 36 Nigerian states + FCT.
const workerSchema = new mongoose.Schema(
    {
        // Reference to the owning User account (one profile per user).
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        // Worker's full name (required).
        fullName: { type: String, required: true, trim: true },
        // Job profession, e.g. "Registered Nurse".
        profession: { type: String },
        // Optional area of specialty within the profession.
        specialty: { type: String },
        // Years of professional experience (non-negative).
        yearsOfExperience: { type: Number, min: 0 },
        // Where the worker is based.
        location: { address: { type: String }, street: { type: String }, state: { type: String,
            enum: [
            "Abia",
            "Adamawa",
            "Akwa Ibom",
            "Anambra",
            "Bauchi",
            "Bayelsa",
            "Benue",
            "Borno",
            "Cross River",
            "Delta",
            "Ebonyi",
            "Edo",
            "Ekiti",
            "Enugu",
            "Gombe",
            "Imo",
            "Jigawa",
            "Kaduna",
            "Kano",
            "Katsina",
            "Kebbi",
            "Kogi",
            "Kwara",
            "Lagos",
            "Nasarawa",
            "Niger",
            "Ogun",
            "Ondo",
            "Osun",
            "Oyo",
            "Plateau",
            "Rivers",
            "Sokoto",
            "Taraba",
            "Yobe",
            "Zamfara",
            "Federal Capital Territory"
        ]}, country: { type: String } },
        proofOfLocation: { type: String, default: ""},
        certifications: {
            professionalLicense: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verifiedAt: { type: Date }},
            cprCertification: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verifiedAt: { type: Date }},
            backgroundCheck: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verifiedAt: { type: Date }} 
            },
        about: { type: String }
    }, { timestamps: true }
)

const Worker = mongoose.model('Worker', workerSchema);

export default Worker;