import Application from "../models/applicationModel.js";
import ShiftAssignment from "../models/shiftAssignmentModel.js";
import Worker from "../models/workerModel.js";
import mongoose from "mongoose";

const createAssignment = async (userId, applicationId) => {
  // Use a transaction so the assignment and shift status update succeed or fail together.
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Load the application together with its shift and facility so we can verify
    // the application, shift status, and facility ownership before assigning the worker.
    const application = await Application.findById(applicationId)
      .populate({
        path: "shift",
        populate: {
          path: "facility",
        },
      })
      .session(session);

    if (!application) {
      throw new Error("Application not found.");
    }

    if (!application.shift) {
      throw new Error("Shift not found for this application.");
    }

    if (!application.shift.facility) {
      throw new Error("Facility not found for this shift.");
    }

    // Only accepted applications can become shift assignments.
    if (application.status !== "accepted") {
      throw new Error(
        "Only accepted applications can be assigned to a shift.",
      );
    }

    // The authenticated facility must own the shift before it can assign a worker.
    if (
      application.shift.facility.user.toString() !== userId.toString()
    ) {
      throw new Error(
        "You are not authorized to create an assignment for this shift.",
      );
    }

    // A shift must still be open before another worker can be assigned to it.
    if (application.shift.status !== "open") {
      throw new Error(
        "This shift is no longer accepting assignments.",
      );
    }

    // Prevent the same accepted application from creating multiple assignments.
    const existingAssignment = await ShiftAssignment.findOne({
      application: application._id,
    }).session(session);

    if (existingAssignment) {
      throw new Error("This application has already been assigned.");
    }

    // Check how many workers have already been assigned so the shift
    // does not exceed the number of professionals requested by the facility.
    const assignmentCount = await ShiftAssignment.countDocuments({
      shift: application.shift._id,
    }).session(session);

    if (assignmentCount >= application.shift.professionalsNeeded) {
      throw new Error("This shift has reached its worker capacity.");
    }

    const assignment = await ShiftAssignment.create(
      [
        {
          application: application._id,
          worker: application.worker,
          shift: application.shift._id,
        },
      ],
      { session },
    );

    const newAssignmentCount = assignmentCount + 1;

    // Once the required number of workers has been assigned,
    // prevent the shift from accepting further applications or assignments.
    if (newAssignmentCount >= application.shift.professionalsNeeded) {
      await application.shift.updateOne(
        { status: "filled" },
        { session },
      );
    }

    await session.commitTransaction();

    return assignment[0];
  } catch (error) {
    // Roll back all database changes if any part of the assignment process fails.
    await session.abortTransaction();
    throw error;
  } finally {
    // Always close the database session after the transaction finishes.
    await session.endSession();
  }
};

const getMyAssignments = async (userId) => {
  const assignments = await ShiftAssignment.find()
    .populate({
      path: "worker",
      match: { user: userId },
    })
    .populate({
      path: "shift",
      populate: {
        path: "facility",
      },
    });

  // The worker filter ensures each worker only receives their own assignments.
  return assignments.filter((assignment) => assignment.worker);
};

const getAssignmentById = async (userId, assignmentId) => {
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  // Match both the assignment ID and authenticated worker so a worker
  // cannot access another worker's assignment by changing the URL ID.
  const assignment = await ShiftAssignment.findOne({
    _id: assignmentId,
    worker: worker._id,
  })
    .populate({
      path: "worker",
    })
    .populate({
      path: "shift",
      populate: { path: "facility" },
    });

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  return assignment;
};

export {
  createAssignment,
  getMyAssignments,
  getAssignmentById,
};

