import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";

//workers apply for shifts, this service handles the application logic

const applyForShift = async (userId, shiftId) => {
  //check for  worker id and shift id
  const worker = await Worker.findOne({ user: userId });
  if (!worker) {
    throw new Error("Worker not found.");
  }
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw new Error("Shift not found.");
  }
  //check if the shift application is still open
  if (shift.status !== "open") {
    throw new Error("This shift is no longer accepting applications.");
  }
  // Check if the worker has already applied for the shift
  const existingApplication = await Application.findOne({
    worker: worker._id,
    shift: shiftId,
  });

  if (existingApplication) {
    throw new Error("You have already applied for this shift.");
  }

  //all this being checked, open the application as required by the worker
  const application = await Application.create({
    worker: worker._id,
    shift: shiftId,
  });
  return application;
};

//get all my applications for a worker

const getApplicationsForWorker = async (userId) => {
  const worker = await Worker.findOne({ user: userId });
  if (!worker) {
    throw new Error("Worker not found.");
  }
  const applications = await Application.find({ worker: worker._id }).populate({
    path: "shift",
    populate: {
      path: "facility",
    },
  });
  //if there are no applications for the worker, throw an error
  if (!applications) {
    throw new Error("No applications found for this worker.");
  }
  return applications;
};
//get all applicants and applications for a facility
const getApplicationsForFacility = async (userId) => {
  const facility = await Facility.findOne({
    user: userId,
  });

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

  // Remove applications whose shift doesn't belong to this facility
  const facilityApplications = applications.filter(
    (application) => application.shift !== null,
  );

  if (facilityApplications.length === 0) {
    throw new Error("No applications found for this facility.");
  }

  return facilityApplications;
};

//facility can accept or reject an application for their shift ( hence the application status)
const updateApplicationStatus = async (userId, applicationId, status) => {
  //find the facility for the user from the user id in the database, if no facility is found, throw an error
  const facility = await Facility.findOne({ user: userId });
  if (!facility) {
    throw new Error("Facility not found for this user.");
  }

  //check if the application exists, if not throw an error
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
  //check if this application belongs to the facility, if not throw an error
  if (application.shift.facility._id.toString() !== facility._id.toString()) {
    throw new Error("You are not authorized to update this application.");
  }
  //if the application belongs to the facility then only allow or reject
  if (!["accepted", "rejected"].includes(status)) {
    throw new Error(
      "Invalid status. Only 'accepted' or 'rejected' are allowed.",
    );
  }
  //update the application status
  application.status = status;
  await application.save();
  return application;
};

export default {
  applyForShift,
  getApplicationsForWorker,
  getApplicationsForFacility,
  updateApplicationStatus,
};
