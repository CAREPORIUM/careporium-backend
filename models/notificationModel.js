import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
    type: String,
    required: true,
    enum: [
    "WELCOME",
    "APPLICATION_RECEIVED",
    "APPLICATION_SUBMITTED",
    "APPLICATION_STATUS_UPDATED",
    "FACILITY_VERIFIED",
    "WORKER_VERIFIED",
    "WORKER_DOCUMENT_STATUS_UPDATED",
    "SHIFT_STATUS_UPDATED",
    "SHIFT_FEEDBACK_REQUESTED",
    "SHIFT_POSTED",
    "PAYMENT_RELEASED",
    "SHIFT_STARTING_SOON",
    "URGENT_SHIFT_UNFILLED",
    "SHIFT_COMPLETION_CONFIRMATION_REQUIRED",
    "FACILITY_DOCUMENT_STATUS_UPDATED",
    "SHIFT_CLOCK_OUT_REMINDER"
  ],
},
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    actionText: {
  type: String,
  trim: true,
    },
   actionLink: {
  type: String,
  trim: true,
   },
    isRead: {
      type: Boolean,
      default: false,
    },
    resourceType: {
      type: String,
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;