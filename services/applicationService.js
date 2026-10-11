import { createNotification } from "./notificationService.js";
import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";

// Workers apply for shifts.

const applyForShift = async (userId, shiftId) => {
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  const shift = await Shift.findById(shiftId);

  if (!shift) {
    throw new Error("Shift not found.");
  }

  if (shift.status !== "open") {
    throw new Error("This shift is no longer accepting applications.");
  }

  const existingApplication = await Application.findOne({
    worker: worker._id,
    shift: shiftId,
  });

  if (existingApplication) {
    throw new Error("You have already applied for this shift.");
  }

  const application = await Application.create({
    worker: worker._id,
    shift: shiftId,
  });

  try {
    // Notify the facility about the new application.
    const facility = await Facility.findById(shift.facility);

    if (facility?.user) {
      await createNotification({
        recipient: facility.user,
        type: "APPLICATION_RECEIVED",
        title: "New shift application",
        message: `${worker.fullName} has applied for your ${shift.role} shift.`,
        resourceType: "Application",
        resourceId: application._id,
      });
    }

    // Notify the worker that their application is under review.
    await createNotification({
      recipient: userId,
      type: "APPLICATION_RECEIVED",
      title: "Application under review",
      message: `Your application for the ${shift.role} shift has been received and is being reviewed by the facility. You will be notified when a decision is made.`,
      resourceType: "Application",
      resourceId: application._id,
    });
  } catch (error) {
    // Keep the saved application even if notification delivery fails.
    console.error(
      `Failed to send application notification for ${application._id}:`,
      error.message,
    );
  }

  return application;
};

// Get all applications for a worker.
const getApplicationsForWorker = async (userId) => {
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  const applications = await Application.find({
    worker: worker._id,
  }).populate({
    path: "shift",
    populate: {
      path: "facility",
    },
  });

  if (!applications) {
    throw new Error("No applications found for this worker.");
  }

  return applications;
};

// Get all applications for a facility.
const getApplicationsForFacility = async (userId) => {
  const facility = await Facility.findOne({ user: userId });

  if (!facility) {
    throw new Error("Facility not found for this user.");
  }

  const applications = await Application.find()
    .populate({
      path: "shift",
      match: { facility: facility._id },
      populate: {
        path: "facility",
      },
    })
    .populate({
      path: "worker",
      select: "fullName profession specialty yearsOfExperience location",
    });

  const facilityApplications = applications.filter(
    (application) => application.shift !== null,
  );

  if (facilityApplications.length === 0) {
    throw new Error("No applications found for this facility.");
  }

  return facilityApplications;
};

// Facility accepts or rejects an application.
const updateApplicationStatus = async (userId, applicationId, status) => {
  const facility = await Facility.findOne({ user: userId });

  if (!facility) {
    throw new Error("Facility not found for this user.");
  }

  const application = await Application.findById(applicationId).populate({
    path: "shift",
    populate: {
      path: "facility",
      select: "facilityName facilityType location",
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (
    !application.shift?.facility ||
    application.shift.facility._id.toString() !== facility._id.toString()
  ) {
    throw new Error("You are not authorized to update this application.");
  }

  if (!["accepted", "rejected"].includes(status)) {
    throw new Error(
      "Invalid status. Only 'accepted' or 'rejected' are allowed.",
    );
  }

  const previousStatus = application.status;

  application.status = status;
  await application.save();

  if (previousStatus !== status) {
    const worker = await Worker.findById(application.worker);

    if (worker?.user) {
      await createNotification({
        recipient: worker.user,
        type: "APPLICATION_STATUS_UPDATED",
        title: "Application status updated",
        message: `Your application for the ${application.shift.role} shift has been ${status}.`,
        resourceType: "Application",
        resourceId: application._id,
      });
    }
  }

  return application;
};

export default {
  applyForShift,
  getApplicationsForWorker,
  getApplicationsForFacility,
  updateApplicationStatus,
};