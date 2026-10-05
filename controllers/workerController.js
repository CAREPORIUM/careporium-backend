import {
    getWorkerProfile,
    updateWorkerProfile
} from '../services/workerService.js';

// receives the retrieve worker's profile request and passes the request data to the...
// ...getWorkerProfile service in workerService.js, which handles the retrieval logic
const getWProfile = async (req, res) => {
  try {
    const worker = await getWorkerProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// receives the update worker's profile request and passes the request data to the...
// ...updateWorkerProfile service in workerService.js, which handles the update logic
const updateWProfile = async (req, res) => {
const updateProfile = async (req, res) => {
    try {
        const worker = await updateWorkerProfile(
            req.user.id,
            req.body
        );

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export { getWProfile, updateWProfile };
