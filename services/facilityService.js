import Facility from '../models/facilityModel.js'


// handles retrieval of facility's profile
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


// handles updating of facility's profile
const updateFacilityProfile = async (userId, updateData) => {

    // only allow these facility profile field to be updated
    const allowedFields = [
        'facilityName',
        'facilityType',
    ];

    const filteredData = {};
    for (const field of allowedFields) {

        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    }

        // check if any location information was provided
// Check if any location information was provided
if (
    updateData.locationaddress !== undefined ||
    updateData.locationcity !== undefined ||
    updateData.locationstate !== undefined ||
    updateData.locationcountry !== undefined
) {
    // Create the location object
    filteredData.location = {
        address: updateData.locationaddress,
        city: updateData.locationcity,
        state: updateData.locationstate,
        country: updateData.locationcountry
    };
}

    // check if any secondary contact information was provided
    if (
        updateData.secondaryContactfullName !== undefined ||
        updateData.secondaryContactposition !== undefined ||
        updateData.secondaryContactemail !== undefined ||
        updateData.secondaryContactphoneNumber !== undefined
    ) {

        // create the secondary contact object
        filteredData.secondaryContact = {
        fullName: updateData.secondaryContactfullName,
        position: updateData.secondaryContactposition,
        email: updateData.secondaryContactemail,
        phoneNumber: updateData.secondaryContactphoneNumber
    };
    }

    const facility = await Facility.findOneAndUpdate(
        {
            user: userId
        },
        filteredData,
        {
            returnDocument: 'after',
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