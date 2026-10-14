import mongoose from "mongoose";

// Mongoose schema for a Facility profile. Linked one-to-one with a User account
// via the `user` field. Stores the facility's identity/location and the
// verification documents uploaded to Cloudinary (each with a verification
// status of pending/verified/rejected for the admin review flow).
const facilitySchema = new mongoose.Schema(
  {
    // Reference to the owning User account (one profile per user).
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Facility name — unique across the platform (required).
    facilityName: { type: String, required: true, unique: true },
    // Facility type, e.g. "Hospital" (required).
    facilityType: { type: String, required: true },
    // Facility address; `state` is restricted to the 36 Nigerian states + FCT.
    location: { address: { type: String, required: true }, street: { type: String, required: true }, state: { type: String,
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
        "Federal Capital Territory",
      ]},
      country: { type: String, required: true }
    },
    // Required verification documents, each stored as a Cloudinary URL and
    // reviewed by an admin (verificationStatus: pending | verified | rejected).
    businessRegCert: {
      url: { type: String, required: true },
      verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
      verifiedAt: { type: Date }
    },
    facilityLicense: {
      url: { type: String, required: true },
      verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
      verifiedAt: { type: Date }
    },
    TaxID: {
      url: { type: String, required: true },
      verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending"},
      verifiedAt: { type: Date }},
    secondaryContact: { fullName: { type: String }, position: { type: String }, email: {type: String }, phoneNumber: { type: String } }
  }, { timestamps: true },
);

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
