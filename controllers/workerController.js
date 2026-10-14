import { getWorkerProfile, updateWorkerProfile } from '../services/workerService.js';

// GET /get-worker-profile — fetch the signed-in worker's profile.
// Passes the authenticated user id (req.user.id) to the worker service, which
// handles retrieval and populate logic. Returns 404 if no profile exists.
const getWProfile = async (req, res) => {
    try {
        const worker = await getWorkerProfile(req.user.id);

        res.status(200).json({
            success: true,
            data: worker
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// PUT /update-worker-profile/:userId — update the signed-in worker's profile.
// The service only applies allow-listed fields; returns 400 on failure.
const updateWProfile = async (req, res) => {
    try {
        const worker = await updateWorkerProfile(
            req.user.id,
            req.body
        );

        res.status(200).json({
            success: true,
            data: worker
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export { getWProfile, updateWProfile };