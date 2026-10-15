import mongoose from "mongoose";

// work experience schema
const workExperienceSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    workplace: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    startMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    startYear: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
    endMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    endYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
      default: null,
    },
    currentlyWorkHere: {
      type: Boolean,
      default: false,
    },
    responsibilities: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const workerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profession: {
      type: String,
    },
    specialty: {
      type: String,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    location: {
      address: {
        type: String,
      },
      street: {
        type: String,
      },
      state: {
        type: String,
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
      country: {
        type: String,
      },
    },

    // proof of location document
    proofOfLocation: {
      url: {
        type: String,
        default: "",
      },
      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      verificationComment: {
        type: String,
        default: "",
      },
      verifiedAt: {
        type: Date,
      },
    },

    // worker certification documents
    certifications: {
      professionalLicense: {
        url: {
          type: String,
          default: "",
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationComment: {
          type: String,
          default: "",
        },
        verifiedAt: {
          type: Date,
        },
      },
      idDocument: {
        url: {
          type: String,
          default: "",
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationComment: {
          type: String,
          default: "",
        },
        verifiedAt: {
          type: Date,
        },
      },
      educationCert: {
        url: {
          type: String,
          default: "",
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationComment: {
          type: String,
          default: "",
        },
        verifiedAt: {
          type: Date,
        },
      },
    },

    // Work experience
    workExperience: {
      type: [workExperienceSchema],
      default: [],
    },

    // Worker bank details for receiving shift payments
    payoutBankName: {
      type: String,
      trim: true,
      default: null,
    },
    payoutBankCode: {
      type: String,
      trim: true,
      default: null,
    },
    payoutAccountNumber: {
      type: String,
      trim: true,
      select: false,
      default: null,
    },
    payoutAccountName: {
      type: String,
      trim: true,
      default: null,
    },

    // Paystack recipient code used for worker transfers
    paystackRecipientCode: {
      type: String,
      select: false,
      default: null,
    },

    // Indicates whether the saved bank details have been verified
    payoutDetailsVerified: {
      type: Boolean,
      default: false,
    },

    // overall worker verification status
    verificationStatus: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
    },
    verifiedAt: {
      type: Date,
    },

    // worker's profile description
    about: {
      type: String,
    },
  },
  { timestamps: true },
);

const Worker = mongoose.model("Worker", workerSchema);

export default Worker;