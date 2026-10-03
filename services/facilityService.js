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
        'secondaryContact'
    ];

    const filteredData = {};
    for (const field of allowedFields) {

        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    }

        // check if any location information was provided
    if (
        updateData.address !== undefined ||
        updateData.city !== undefined ||
        updateData.state !== undefined ||
        updateData.country !== undefined
    ) {

        // create the location object
        filteredData.location = {
            address: updateData.address,
            city: updateData.city,
            state: updateData.state,
            country: updateData.country
        };
    }

    // check if any secondary contact information was provided
    if (
        updateData.secondaryContactFullName !== undefined ||
        updateData.secondaryContactPosition !== undefined ||
        updateData.secondaryContactEmail !== undefined ||
        updateData.secondaryContactPhoneNumber !== undefined
    ) {

        // create the secondary contact object
        filteredData.secondaryContact = {
        fullName: updateData.secondaryContactFullName,
        position: updateData.secondaryContactPosition,
        email: updateData.secondaryContactEmail,
        phoneNumber: updateData.secondaryContactPhoneNumber
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