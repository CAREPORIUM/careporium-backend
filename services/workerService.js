import Worker from '../models/workerModel.js';
import cloudinary from '../config/cloudinary.js';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';

// handles retrieval of worker's profile
const getWorkerProfile = async (userId) => {
    const worker = await Worker.findOne({
        user: userId
    }).populate(
        "user",
        "-password -verificationOtp -verificationOtpExpires"
    );

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

// handles updating of worker's profile
const updateWorkerProfile = async (userId, updateData, files) => {
    // only allow these worker profile fields to be updated
    const allowedFields = [
        'fullName',
        'profession',
        'specialty',
        'yearsOfExperience',
        'about'
    ];

    // create an empty object to store the fields...
    // ...that the user is allowed to update
    const filteredData = {};

    // go through each allowed field
    for (const field of allowedFields) {
        // check if the user actually provided this field
        if (updateData[field] !== undefined) {
            // add the field and its value to filteredData
            filteredData[field] = updateData[field];
        }
    }

   // check if any location information was provided
    if (
        updateData.locationAddress !== undefined ||
        updateData.locationStreet !== undefined ||
        updateData.locationState !== undefined ||
        updateData.locationCountry !== undefined
    ) {

        // create the location object
        filteredData.location = {
            address: updateData.locationAddress,
            street: updateData.locationStreet,
            state: updateData.locationState,
            country: updateData.locationCountry
        };
    }

    const worker = await Worker.findOne({
        user: userId
    });

    if (!worker) {
        throw new Error('Profile not found');
    }

    // handle password change separately because
    // the password belongs to the User model, not the Worker model
if (updateData.password !== undefined) {
    if (!updateData.password || updateData.password.trim() === '') {
        throw new Error('Password cannot be empty');
    }

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(updateData.password, 10);

    // Find the user's account
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Update the user's password
    user.password = hashedPassword;

    // Save the updated user
    await user.save();
}

    // update the worker's profile information
    Object.assign(worker, filteredData);

    // make sure the certifications object exists
    if (!worker.certifications) {
        worker.certifications = {};
    }

    // make sure the professional license object exists
    if (!worker.certifications.professionalLicense) {
        worker.certifications.professionalLicense = {};
    }

    // make sure the ID document object exists
    if (!worker.certifications.idDocument) {
        worker.certifications.idDocument = {};
    }

    // make sure the education certificate object exists
    if (!worker.certifications.educationCert) {
        worker.certifications.educationCert = {};
    }

    // make sure the proof of location object exists
    if (!worker.proofOfLocation) {
        worker.proofOfLocation = {};
    }

    // check if a professional license was uploaded
    if (files?.professionalLicense?.[0]) {

        // upload the professional license to Cloudinary
        const professionalLicenseUpload =
            await cloudinary.uploader.upload(
                files.professionalLicense[0].path,
                {
                    folder: 'careporium/worker-documents'
                }
            );

        // save the Cloudinary URL
        worker.certifications.professionalLicense.url =
            professionalLicenseUpload.secure_url;

        // newly uploaded documents must be reviewed again
        worker.certifications.professionalLicense.verificationStatus =
            'pending';

        // remove the previous verification date
        worker.certifications.professionalLicense.verifiedAt =
            undefined;
    }


    // check if an ID document was uploaded
    if (files?.idDocument?.[0]) {

        // upload the ID document to Cloudinary
        const idDocumentUpload =
            await cloudinary.uploader.upload(
                files.idDocument[0].path,
                {
                    folder: 'careporium/worker-documents'
                }
            );

        // save the Cloudinary URL
        worker.certifications.idDocument.url =
            idDocumentUpload.secure_url;

        // newly uploaded documents must be reviewed again
        worker.certifications.idDocument.verificationStatus =
            'pending';

        // remove the previous verification date
        worker.certifications.idDocument.verifiedAt =
            undefined;
    }


    // check if an education certificate was uploaded
    if (files?.educationCert?.[0]) {

        // upload the education certificate to Cloudinary
        const educationCertUpload =
            await cloudinary.uploader.upload(
                files.educationCert[0].path,
                {
                    folder: 'careporium/worker-documents'
                }
            );

        // save the Cloudinary URL
        worker.certifications.educationCert.url =
            educationCertUpload.secure_url;

        // newly uploaded documents must be reviewed again
        worker.certifications.educationCert.verificationStatus =
            'pending';

        // remove the previous verification date
        worker.certifications.educationCert.verifiedAt =
            undefined;
    }


    // check if proof of location was uploaded
    if (files?.proofOfLocation?.[0]) {

        // upload the proof of location to Cloudinary
        const proofOfLocationUpload =
            await cloudinary.uploader.upload(
                files.proofOfLocation[0].path,
                {
                    folder: 'careporium/worker-documents'
                }
            );

        // save the Cloudinary URL
        worker.proofOfLocation.url =
            proofOfLocationUpload.secure_url;

        // newly uploaded documents must be reviewed again
        worker.proofOfLocation.verificationStatus =
            'pending';

        // remove the previous verification date
        worker.proofOfLocation.verifiedAt =
            undefined;
    }


    // save the updated worker profile
    await worker.save();


    // get the updated worker profile and populate the user information
    const updatedWorker = await Worker.findById(
        worker._id
    ).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedWorker;
};

export {
    getWorkerProfile,
    updateWorkerProfile
};