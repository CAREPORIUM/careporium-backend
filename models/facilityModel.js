import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    facilityName: { type: String, unique: true },
    facilityType: { type: String },
    location: { address: { type: String }, city: { type: String }, state: { type: String,
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
      country: { type: String }
    },
    businessRegCert: {
        url: { type: String },
        verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
        verificationComment: { type: String, default: "" }, 
        verifiedAt: { type: Date }
    }, 
    facilityLicense: {
        url: { type: String },
        verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
        verificationComment: { type: String, default: "" }, 
        verifiedAt: { type: Date },
    }, 
    taxID: {
        url: { type: String },
        verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
        verificationComment: { type: String, default: "" }, 
        verifiedAt: { type: Date },
    },
    verificationStatus: { type: String, enum: ["pending", "verified"], default: "pending" },
    verifiedAt: { type: Date },
    secondaryContact: { fullName: { type: String, default: ""}, position: { type: String, default: "" }, 
    email: { type: String, default: "" }, phoneNumber: { type: String, default: "" } }
  }, { timestamps: true },
);

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
