import Facility from '../models/facilityModel.js'


// handles retrieval of worker's profile
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



// handles updating of worker's profile
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