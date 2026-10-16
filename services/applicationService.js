import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";
import { createNotification } from "./notificationService.js";


// workers apply for shifts, this service handles the application logic

const applyForShift = async (userId, shiftId) => {
  // check for worker id and shift id
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found");
  }

  const shift = await Shift.findById(shiftId);

  if (!shift) {
    throw new Error("Shift not found");
  }

  // check if the shift application is still open
  if (shift.status !== "open") {
    throw new Error("This shift is no longer accepting applications.");
  }

  // check if the shift still needs professionals
  if (
    shift.assignedWorkers.length >=
    shift.professionalsNeeded
  ) {
    throw new Error(
      "This shift already has all the professionals it needs."
    );
  }

  // check if the worker has already applied for the shift
  const existingApplication = await Application.findOne({
    worker: worker._id,
    shift: shiftId,
  });

  if (existingApplication) {
    throw new Error("You have already applied for this shift.");
  }

  // all this being checked, open the application as required by the worker
  const application = await Application.create({
    worker: worker._id,
    shift: shiftId,
  });

    // notify the facility when a worker applies for a shift
  try {
    const facility = await Facility.findById(shift.facility);

    if (facility?.user) {
      await createNotification({
        recipient: facility.user,
        type: "APPLICATION_RECEIVED",
        title: "New shift application",
        message: "A worker has applied for your shift.",
        actionText: "View application",
        actionLink: "/facility/applications",
        resourceType: "Application",
        resourceId: application._id,
      });
    }
  } catch (error) {
    console.error(
      "Failed to create facility application notification:",
      error
    );
  }

  // notify the worker that the application was submitted successfully
  try {
    await createNotification({
      recipient: userId,
      type: "APPLICATION_SUBMITTED",
      title: "Application submitted",
      message: "Your shift application has been submitted successfully.",
      actionText: "View my applications",
      actionLink: "/worker/applications",
      resourceType: "Application",
      resourceId: application._id,
    });
  } catch (error) {
    console.error(
      "Failed to create worker application notification:",
      error
    );
  }

  return application;
};


// get all my applications as a worker
const getApplicationsForWorker = async (userId) => {
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  const applications = await Application.find({ worker: worker._id })
    .populate({
      path: "shift",
      populate: {
        path: "facility",
        select: "facilityName facilityType location",
      },
    });

  // if there are no applications for the worker, throw an error
  if (!applications) {
    throw new Error("No applications found for this worker.");
  }

  return applications;
};

export default { applyForShift, getApplicationsForWorker };