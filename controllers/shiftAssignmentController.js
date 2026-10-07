import {
  createAssignment,
  getMyAssignments,
  getAssignmentById,
} from "../services/assignmentService.js";

const createAssignmentController = async (req, res) => {
  try {
    // Use the authenticated facility's user ID instead of trusting a user ID from the client.
    const userId = req.user.id;
    const { applicationId } = req.params;

    const assignment = await createAssignment(
      userId,
      applicationId,
    );

    res.status(201).json({
      message: "Worker assigned to shift successfully.",
      data: assignment,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

const getMyAssignmentsController = async (req, res) => {
  try {
    // The authenticated worker's ID is used to return only their assignments.
    const userId = req.user.id;
    const assignments = await getMyAssignments(userId);

    res.status(200).json({
      message: "Assignments retrieved successfully.",
      data: assignments,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

const getAssignmentByIdController = async (req, res) => {
  try {
    // Pass the authenticated user's ID to the service so ownership can be verified.
    const userId = req.user.id;
    const { assignmentId } = req.params;

    const assignment = await getAssignmentById(
      userId,
      assignmentId
    );

    res.status(200).json({
      message: "Assignment retrieved successfully.",
      data: assignment,
    });
  } catch (error) {
    res.status(404).json({
      error: error.message,
    });
  }
};

export default {
  createAssignment: createAssignmentController,
  getMyAssignments: getMyAssignmentsController,
  getAssignmentById: getAssignmentByIdController,
};

