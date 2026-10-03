import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        fullName: { type: String, required: true, trim: true },
        profession: { type: String },
        specialty: { type: String },
        yearsOfExperience: { type: Number, min: 0 },
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
        proofOfLocation: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verificationComment: { type: String, default: "" }, verifiedAt: { type: Date }}, 
        certifications: {
            professionalLicense: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verificationComment: { type: String, default: "" }, verifiedAt: { type: Date }}, 
            idDocument: {
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verificationComment: { type: String, default: "" }, verifiedAt: { type: Date }}, 
            educationCert:{
                url: { type: String, default: "" },
                verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
                verificationComment: { type: String, default: "" }, verifiedAt: { type: Date }}, 
            },
        about: { type: String }
    }, { timestamps: true }
)

const Worker = mongoose.model('Worker', workerSchema);

export default Worker;