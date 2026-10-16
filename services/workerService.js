import mongoose from 'mongoose';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';
import Application from '../models/applicationModel.js';

// validates the worker's work experience entries
const validateWorkExperience = (workExperience) => {
    // accept an array or a JSON string from multipart/form-data
    if (typeof workExperience === "string") {
        try {
            workExperience = JSON.parse(workExperience);
        } catch {
            throw new Error(
                "Work experience must be a valid JSON array"
            );
        }
    }

    if (!Array.isArray(workExperience)) {
        throw new Error("Work experience must be an array");
    }

    return workExperience.map((experience, index) => {
        if (
            !experience ||
            typeof experience !== "object" ||
            Array.isArray(experience)
        ) {
            throw new Error(
                `Work experience entry ${index + 1} is invalid`
            );
        }

        const {
            jobTitle,
            workplace,
            location,
            startMonth,
            startYear,
            endMonth,
            endYear,
            currentlyWorkHere,
            responsibilities
        } = experience;

        // ensure required text fields are provided
        if (
            typeof jobTitle !== "string" ||
            !jobTitle.trim() ||
            typeof workplace !== "string" ||
            !workplace.trim() ||
            typeof location !== "string" ||
            !location.trim() ||
            typeof responsibilities !== "string" ||
            !responsibilities.trim()
        ) {
            throw new Error(
                `Job title, workplace, location, and responsibilities are required for work experience entry ${index + 1}`
            );
        }

        // validate the start month and year
        const parsedStartMonth = Number(startMonth);
        const parsedStartYear = Number(startYear);

        if (
            startMonth === undefined ||
            startMonth === null ||
            startMonth === "" ||
            !Number.isInteger(parsedStartMonth) ||
            parsedStartMonth < 1 ||
            parsedStartMonth > 12
        ) {
            throw new Error(
                `A valid start month is required for work experience entry ${index + 1}`
            );
        }

        if (
            startYear === undefined ||
            startYear === null ||
            startYear === "" ||
            !Number.isInteger(parsedStartYear) ||
            parsedStartYear < 1900 ||
            parsedStartYear > new Date().getFullYear()
        ) {
            throw new Error(
                `A valid start year is required for work experience entry ${index + 1}`
            );
        }

        // validate whether the worker currently works here
        if (
            typeof currentlyWorkHere !== "boolean" &&
            currentlyWorkHere !== "true" &&
            currentlyWorkHere !== "false"
        ) {
            throw new Error(
                `currentlyWorkHere must be true or false for work experience entry ${index + 1}`
            );
        }

        const isCurrentJob =
            currentlyWorkHere === true ||
            currentlyWorkHere === "true";

        let parsedEndMonth = null;
        let parsedEndYear = null;

        if (isCurrentJob) {
            // current jobs must not have an end date
            if (
                (endMonth !== undefined &&
                    endMonth !== null &&
                    endMonth !== "") ||
                (endYear !== undefined &&
                    endYear !== null &&
                    endYear !== "")
            ) {
                throw new Error(
                    `End month and end year must be empty for current work experience entry ${index + 1}`
                );
            }
        } else {
            // previous jobs must have an end month and year
            if (
                endMonth === undefined ||
                endMonth === null ||
                endMonth === "" ||
                endYear === undefined ||
                endYear === null ||
                endYear === ""
            ) {
                throw new Error(
                    `End month and end year are required for previous work experience entry ${index + 1}`
                );
            }

            parsedEndMonth = Number(endMonth);
            parsedEndYear = Number(endYear);

            if (
                !Number.isInteger(parsedEndMonth) ||
                parsedEndMonth < 1 ||
                parsedEndMonth > 12
            ) {
                throw new Error(
                    `A valid end month is required for work experience entry ${index + 1}`
                );
            }

            if (
                !Number.isInteger(parsedEndYear) ||
                parsedEndYear < 1900 ||
                parsedEndYear > new Date().getFullYear()
            ) {
                throw new Error(
                    `A valid end year is required for work experience entry ${index + 1}`
                );
            }

            // ensure the end date does not precede the start date
            if (
                parsedEndYear < parsedStartYear ||
                (
                    parsedEndYear === parsedStartYear &&
                    parsedEndMonth < parsedStartMonth
                )
            ) {
                throw new Error(
                    `The end date cannot be before the start date for work experience entry ${index + 1}`
                );
            }
        }

        return {
            jobTitle: jobTitle.trim(),
            workplace: workplace.trim(),
            location: location.trim(),
            startMonth: parsedStartMonth,
            startYear: parsedStartYear,
            endMonth: isCurrentJob ? null : parsedEndMonth,
            endYear: isCurrentJob ? null : parsedEndYear,
            currentlyWorkHere: isCurrentJob,
            responsibilities: responsibilities.trim()
        };
    });
};

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
            filteredData[field] = updateData[field];
        }
    }

    // check if any location information was provided
    if (updateData.locationAddress !== undefined) {
        filteredData['location.address'] = updateData.locationAddress;
    }

    if (updateData.locationStreet !== undefined) {
        filteredData['location.street'] = updateData.locationStreet;
    }

    if (updateData.locationState !== undefined) {
        filteredData['location.state'] = updateData.locationState;
    }

    if (updateData.locationCountry !== undefined) {
        filteredData['location.country'] = updateData.locationCountry;
    }

    const worker = await Worker.findOne({
        user: userId
    });

    if (!worker) {
        throw new Error('Profile not found');
    }

    // validate work experience only when the field is provided
    let validatedWorkExperience;

    if (updateData.workExperience !== undefined) {
        validatedWorkExperience = validateWorkExperience(
            updateData.workExperience
        );
    }

    // update the worker's profile information
    Object.assign(worker, filteredData);

    // update work experience only when the field is provided
    if (validatedWorkExperience !== undefined) {
        worker.workExperience = validatedWorkExperience;
    }

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

        // clear the previous rejection comment
        worker.certifications.professionalLicense.verificationComment = '';

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

        // clear the previous rejection comment
        worker.certifications.idDocument.verificationComment = '';

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

        // clear the previous rejection comment
        worker.certifications.educationCert.verificationComment = '';

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

        // clear the previous rejection comment
        worker.proofOfLocation.verificationComment = '';

        // remove the previous verification date
        worker.proofOfLocation.verifiedAt =
            undefined;
    }

    // check if any verification document was replaced
    const documentReplaced =
        files?.professionalLicense?.[0] ||
        files?.idDocument?.[0] ||
        files?.educationCert?.[0] ||
        files?.proofOfLocation?.[0];

    // reset overall verification when a document is replaced
    if (documentReplaced) {
        worker.verificationStatus = 'pending';
        worker.verifiedAt = undefined;
    }

    // save the updated worker profile
    await worker.save();

    const updatedWorker = await Worker.findById(
    worker._id
)
    .select('+payoutAccountNumber -payoutBankCode')
    .populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedWorker;
};

// gets a specific worker's profile for facility hiring or admin review
const getWorkerProfileForHiring = async (userId, role, workerId) => {

    // validate the worker ID
    if (!mongoose.isValidObjectId(workerId)) {
        throw new Error("Invalid worker ID");
    }

    // find the worker whose profile is being requested
    const worker = await Worker.findById(workerId).lean();

    if (!worker) {
        throw new Error("Worker not found");
    }

    // facilities can only view workers who applied to their shifts
    if (role === 'facility') {

        // find the facility associated with the logged-in user
        const facility = await Facility.findOne({
            user: userId
        }).select('_id');

        if (!facility) {
            throw new Error("Facility not found for this user");
        }

        // find shifts belonging to this facility
        const shifts = await Shift.find({
            facility: facility._id
        }).distinct('_id');

        // confirm that the worker applied to one of this facility's shifts
        const application = await Application.findOne({
            worker: worker._id,
            shift: { $in: shifts }
        }).select('_id');

       /** if (!application) {
            throw new Error(
                "You are not authorized to view this worker's profile"
            );
        } */

    } else if (role !== 'admin') {
        throw new Error("You are not authorized to view this worker's profile");
    }

    // return only the profile information needed for hiring
    return {
        _id: worker._id,
        fullName: worker.fullName,
        profession: worker.profession,
        specialty: worker.specialty,
        yearsOfExperience: worker.yearsOfExperience,

        location: {
            city: worker.location?.city || '',
            state: worker.location?.state || ''
        },

        about: worker.about || '',

        documents: {
            professionalLicense: {
                verificationStatus:
                    worker.certifications?.professionalLicense?.verificationStatus
                    || 'pending'
            },
            idDocument: {
                verificationStatus:
                    worker.certifications?.idDocument?.verificationStatus
                    || 'pending'
            },
            educationCert: {
                verificationStatus:
                    worker.certifications?.educationCert?.verificationStatus
                    || 'pending'
            },
            proofOfLocation: {
                verificationStatus:
                    worker.proofOfLocation?.verificationStatus || 'pending'
            }
        },

        experiences: worker.workExperience || [],
        softSkills: worker.softSkills || [],

        // Connect these values to the actual review and attendance records.
        stats: {
            rating: null,
            reviews: null,
            completedShifts: null,
            attendanceRate: null,
            noShows90Days: null
        }
    };
};

export {
    getWorkerProfile,
    updateWorkerProfile,
    getWorkerProfileForHiring
};