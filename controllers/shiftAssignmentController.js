import assignmentService from "../services/assignmentService.js";

const createAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    const assignment = await assignmentService.createAssignment(
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

export default {
  createAssignment,
};