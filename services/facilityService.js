//import Facility from '../models/facilityModel.js'
import cloudinary from '../config/cloudinary.js'


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
const updateFacilityProfile = async (
    userId, 
    updateData = {}, 
    files = {}) => {
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
    const locationFields = {
        address: updateData.locationAddress ?? updateData.locationaddress,
        city: updateData.locationCity ?? updateData.locationcity,
        state: updateData.locationState ?? updateData.locationstate,
        country: updateData.locationCountry ?? updateData.locationcountry
    };

    for (const [field, value] of Object.entries(locationFields)) {
        if (value !== undefined) {
            filteredData[`location.${field}`] = value;
        }
    }

    // check if any secondary contact information was provided
    const secondaryContactFields = {
        fullName: updateData.secondaryContactFullName ??
            updateData.secondaryContactfullName,
        position: updateData.secondaryContactPosition ??
            updateData.secondaryContactposition,
        email: updateData.secondaryContactEmail ??
            updateData.secondaryContactemail,
        phoneNumber: updateData.secondaryContactPhoneNumber ??
            updateData.secondaryContactphoneNumber
    };

    for (const [field, value] of Object.entries(secondaryContactFields)) {
        if (value !== undefined) {
            filteredData[`secondaryContact.${field}`] = value;
        }
    }

    // find the facility profile
    const facility = await Facility.findOne({
        user: userId
    });

    if (!facility) {
        throw new Error('Facility profile not found');
    }

    // update the facility's profile information
    Object.assign(facility, filteredData);

    // check if a business registration certificate was uploaded
    if (files?.businessRegCert?.[0]) {
        const businessRegCertUpload = await cloudinary.uploader.upload(
            files.businessRegCert[0].path,
            { folder: 'careporium/facility-documents' }
        );

        facility.businessRegCert.url = businessRegCertUpload.secure_url;
        facility.businessRegCert.verificationStatus = 'pending';
        facility.businessRegCert.verificationComment = '';
        facility.businessRegCert.verifiedAt = undefined;
    }

    // check if a facility license was uploaded
    if (files?.facilityLicense?.[0]) {
        const facilityLicenseUpload = await cloudinary.uploader.upload(
            files.facilityLicense[0].path,
            { folder: 'careporium/facility-documents' }
        );

        facility.facilityLicense.url = facilityLicenseUpload.secure_url;
        facility.facilityLicense.verificationStatus = 'pending';
        facility.facilityLicense.verificationComment = '';
        facility.facilityLicense.verifiedAt = undefined;
    }

    // check if a tax ID document was uploaded
    if (files?.taxID?.[0]) {
        const taxIDUpload = await cloudinary.uploader.upload(
            files.taxID[0].path,
            { folder: 'careporium/facility-documents' }
        );

        facility.taxID.url = taxIDUpload.secure_url;
        facility.taxID.verificationStatus = 'pending';
        facility.taxID.verificationComment = '';
        facility.taxID.verifiedAt = undefined;
    }

    // check if any verification document was replaced
    const documentReplaced =
        files?.businessRegCert?.[0] ||
        files?.facilityLicense?.[0] ||
        files?.taxID?.[0];

    // reset overall verification when a document is replaced
    if (documentReplaced) {
        facility.verificationStatus = 'pending';
        facility.verifiedAt = undefined;
    }

    // save the updated facility profile
    await facility.save();

    // get the updated facility profile and populate the user information
    const updatedFacility = await Facility.findById(
        facility._id
    ).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedFacility;
};

import mongoose from 'mongoose';
import Facility from '../models/facilityModel.js';

// gets a single facility's details
const getFacilityById = async (facilityId) => {

    // validate the facility ID
    if (!mongoose.isValidObjectId(facilityId)) {
        throw new Error("Invalid facility ID");
    }

    // find the facility by its ID
    const facility = await Facility.findById(facilityId)
        .select(
            'facilityName facilityType location verificationStatus'
        )
        .lean();

    if (!facility) {
        throw new Error("Facility not found");
    }

    return facility;
};


export { getFacilityProfile, updateFacilityProfile, getFacilityById };