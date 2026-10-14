import Facility from '../models/facilityModel.js'

// ---------------------------------------------------------------------------
// Facility profile service
// ---------------------------------------------------------------------------
// Reads and updates the signed-in facility's profile. Updates are restricted to
// an allow-list of fields so callers can't modify protected data (e.g. the
// verification documents/status), and the linked user document is populated
// (with sensitive fields excluded) on return.
// ---------------------------------------------------------------------------

// Fetch a facility profile by the owning user's id, including the linked user
// record but excluding sensitive fields (password, OTP).
const getFacilityProfile = async (userId) => {
    const facility = await Facility.findOne({
        user: userId
    }).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    if (!facility) {
        throw new Error('Facility profile not found')
    }
    return facility
}



// Update a facility profile. Only allow-listed fields provided in the request
// are applied; schema validators still run on the update.
const updateFacilityProfile = async (userId, updateData) => {

    // only allow these facility profile field to be updated
    const allowedFields = [
        'facilityName',
        'facilityType',
        'location',
        'secondaryContact'
    ];

    const filteredData = {};
    for (const field of allowedFields) {

        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    }


    const facility = await Facility.findOneAndUpdate(
        {
            user: userId
        },
        filteredData,
        {
            new: true,
            runValidators: true
        }
    ).populate(
        'user','-password -verificationOtp -verificationOtpExpires'
    );

    if (!facility) {
        throw new Error('Facility profile not found');
    }

    return facility;
};


export {
    getFacilityProfile,
    updateFacilityProfile
};