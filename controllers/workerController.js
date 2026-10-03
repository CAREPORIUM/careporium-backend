import {
    getWorkerProfile,
    updateWorkerProfile
} from '../services/workerService.js';

// handles retrieval of worker's profile
/** const getWProfile = async (req, res) => {
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
}; */
const getWProfile = async (req, res) => {
    try {
        console.log('USER FROM TOKEN:', req.user);

        const worker = await getWorkerProfile(req.user.id);

        res.status(200).json({
            success: true,
            data: worker
        });

    } catch (error) {
        console.log('WORKER PROFILE ERROR:', error);

        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// handles updating of worker's profile
const updateWProfile = async (req, res) => {
    try {
        // send the user's profile information and uploaded files...
        // ...to the worker service
        const worker = await updateWorkerProfile(
            req.user.id,
            req.body,
            req.files
        );

        res.status(200).json({
            success: true,
            message: 'Worker profile updated successfully',
            data: worker
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export {
    getWProfile,
    updateWProfile
};