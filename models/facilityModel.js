import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    facilityName: { type: String, required: true },
    facilityType: { type: String, required: true },
    adminName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    location: {
      type: String,
      required: true,
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
      ],
    },
    businessRegCert: {
      type: String,
      required: true,
    },
    facilityLicense: {
      type: String,
      required: true,
    },
    TaxID: {
      type: String,
      Required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
