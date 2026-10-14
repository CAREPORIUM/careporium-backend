import { getFacilityProfile, updateFacilityProfile } from '../services/facilityService.js';

// GET /get-profile — fetch the signed-in facility's profile.
// Passes the authenticated user id (req.user.id) to the facility service, which
// handles retrieval and populate logic. Returns 404 if no profile exists.
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

// PUT /update-profile/:userId — update the signed-in facility's profile.
// The service only applies allow-listed fields; returns 400 on failure.
const updateFProfile = async (req, res) => {
    try {
        const facility = await updateFacilityProfile(
            req.user.id,
            req.body
        );

        res.status(200).json({
            success: true,
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