import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ worker: 1, shift: 1 }, { unique: true });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
