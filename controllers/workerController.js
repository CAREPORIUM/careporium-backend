import {
    getWorkerProfile,
    updateWorkerProfile,
    getWorkerProfileForHiring
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
    try {
        const worker = await updateWorkerProfile(
            req.user.id,
            req.body,
            req.files
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

// handles request to retrieve a specific worker's profile for hiring
const getWProfileForHiring = async (req, res) => {
    try {
        const worker = await getWorkerProfileForHiring(
            req.user.id,
            req.user.role,
            req.params.workerId
        );

        res.status(200).json({
            success: true,
            data: worker
        });
    } catch (error) {
        const statusCode =
            error.message === "Worker not found" ||
            error.message === "Facility not found for this user"
                ? 404
                : error.message === "Invalid worker ID"
                    ? 400
                    : error.message.includes("not authorized")
                        ? 403
                        : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

export { getWProfile, updateWProfile, getWProfileForHiring };