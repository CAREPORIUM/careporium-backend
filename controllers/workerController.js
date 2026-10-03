import {
    getWorkerProfile,
    updateWorkerProfile
} from '../services/workerService.js';

// GET WORKER PROFILE
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


// UPDATE WORKER PROFILE
const updateWProfile = async (req, res) => {
    try {
        const worker = await updateWorkerProfile(
            req.user.id,
            req.body,
            req.files
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


export {
    getWProfile,
    updateWProfile
};