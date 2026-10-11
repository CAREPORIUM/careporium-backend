import applicationService from "../services/applicationService.js";

// worker applies for a shift
const applyForShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shiftId } = req.params;
    const application = await applicationService.applyForShift(userId, shiftId);
    res.status(201).json({
      message: "Application submitted successfully.",
      data: application,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//worker views all their applications
const getApplicationsForWorker = async (req, res) => {
  try {
    const userId = req.user.id;
    const applications =
      await applicationService.getApplicationsForWorker(userId);
    res.status(200).json({
      message: "Applications retrieved successfully.",
      data: applications,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//get all applicants and applications for a facility
const getApplicationsForFacility = async (req, res) => {
  try {
    const userId = req.user.id;
    const applications =
      await applicationService.getApplicationsForFacility(userId);
    res.status(200).json({
      message: "Applications retrieved successfully.",
      data: applications,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//update application status for a facility
const updateApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { status } = req.body;
    const application = await applicationService.updateApplicationStatus(
      userId,
      applicationId,
      status,
    );
    res.status(200).json({
      message: "Application status updated successfully.",
      data: application,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export default {
  applyForShift,
  getApplicationsForWorker,
  getApplicationsForFacility,
  updateApplicationStatus,
};