import { getFacilityProfile, updateFacilityProfile } from '../services/facilityService.js';

// receives the retrieve facility's profile request and passes the request data to the...
// ...getFacilityProfile service in facilityService.js, which handles the retrieval logic 
const getFProfile = async (req, res) => {
    try {
        const facility = await getFacilityProfile(req.user.id);

        res.status(200).json({
            success: true,
            data: facility
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// receives the update worker's profile request and passes the request data to the...
// ...updateWorkerProfile service in workerService.js, which handles the update logic 
const updateFProfile = async (req, res) => {
    try {
        const facility = await updateFacilityProfile(
            req.user.id,
            req.body || {},
            req.files || {}
        );

        res.status(200).json({
            success: true,
            message: 'Facility profile updated successfully',
            data: facility
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export { getFProfile, updateFProfile };