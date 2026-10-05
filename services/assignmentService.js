import Application from "../models/applicationModel.js";
import ShiftAssignment from "../models/shiftAssignmentModel.js";

const createAssignment = async (userId, applicationId) => {
  const application = await Application.findById(applicationId).populate({
    path: "shift",
    populate: {
      path: "facility",
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (!application.shift) {
    throw new Error("Shift not found for this application.");
  }

  if (!application.shift.facility) {
    throw new Error("Facility not found for this shift.");
  }

  if (application.status !== "accepted") {
    throw new Error(
      "Only accepted applications can be assigned to a shift.",
    );
  }

  if (
    application.shift.facility.user.toString() !== userId.toString()
  ) {
    throw new Error(
      "You are not authorized to create an assignment for this shift.",
    );
  }

  const existingAssignment = await ShiftAssignment.findOne({
    application: application._id,
  });

  if (existingAssignment) {
    throw new Error("This application has already been assigned.");
  }

  const assignmentCount = await ShiftAssignment.countDocuments({
    shift: application.shift._id,
  });

  if (assignmentCount >= application.shift.professionalsNeeded) {
    throw new Error("This shift has reached its worker capacity.");
  }

  const assignment = await ShiftAssignment.create({
    application: application._id,
    worker: application.worker,
    shift: application.shift._id,
  });

  return assignment;
};

export { createAssignment };