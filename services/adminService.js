import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';

// handles retrieval of all workers
const getAllWorkers = async () => {
    const workers = await Worker.find()
        .populate(
            'user',
            '-password -verificationOtp -verificationOtpExpires'
        )
        .sort({
            createdAt: -1
        });
    return workers
};

// handles retrieval of one worker
const getWorkerById = async (workerId) => {
    const worker = await Worker.findById(workerId)
        .populate(
            'user',
            '-password -verificationOtp -verificationOtpExpires'
        );

    if (!worker) {
        throw new Error('Worker not found')
    }

    return worker
};

// handles verification or rejection of worker documents
const updateWorkerDocumentStatus = async (
    workerId,
    documentType,
    status,
    comment
) => {

    // documents that the admin is allowed to review
    const allowedDocuments = [
        'professionalLicense',
        'idDocument',
        'educationCert',
        'proofOfLocation'
    ];

    // check if the document type is valid
    if (!allowedDocuments.includes(documentType)) {
        throw new Error('Invalid document type');
    }

    // admin can only verify or reject
    const allowedStatuses = [
        'verified',
        'rejected'
    ];

    // check if the status is valid
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid verification status')
    }

    // if admin is rejecting the document,
    // a comment must be provided
    if (
        status === 'rejected' &&
        (!comment || comment.trim() === '')
    ) {
        throw new Error(
            'A comment is required when rejecting a document'
        );
    }

    // find the worker
    const worker = await Worker.findById(workerId)

    if (!worker) {
        throw new Error('Worker not found')
    }

    let document;

    if (
        documentType === 'professionalLicense' ||
        documentType === 'idDocument' ||
        documentType === 'educationCert'
    ) {
        document =
            worker.certifications?.[documentType];
    } else if (documentType === 'proofOfLocation') {
        document = worker.proofOfLocation;
    }

    // make sure the document has been uploaded
    if (!document?.url) {
        throw new Error('Document has not been uploaded')
    }

    document.verificationStatus = status;

    // save the admin's comment
    if (status === 'rejected') {

        document.verificationComment =
            comment.trim();
    } else {
        // clear any previous rejection comment
        document.verificationComment = '';
    }

    // record when the document was reviewed
    document.verifiedAt = new Date();

    await worker.save();

    // return the updated worker
    const updatedWorker = await Worker.findById(
        worker._id
    ).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedWorker;
};

// handles retrieval of all facilities
const getAllFacilities = async () => {
    const facilities = await Facility.find()
        .populate(
            'user',
            '-password -verificationOtp -verificationOtpExpires'
        )
        .sort({
            createdAt: -1
        });
    return facilities;
};

// handles retrieval of pending facilities
const getPendingFacilities = async() =>{
    const facilities = await Facility.find({
        verificationStatus: 'pending'
    })
        .populate(
            'user',
            '-password -verificationOtp -verificationOtpExpires'
        )
        .sort({
            createdAt: -1
        })
        return facilities
}

// handles retrieval of one facility
const getFacilityById = async (facilityId) => {
    const facility = await Facility.findById(facilityId)
        .populate(
            'user',
            '-password -verificationOtp -verificationOtpExpires'
        );

    if (!facility) {
        throw new Error('Facility not found');
    }

    return facility;
};

// handles verification or rejection of facility documents
const updateFacilityDocumentStatus = async (
    facilityId,
    documentType,
    status,
    comment
) => {

    // documents that the admin is allowed to review
    const allowedDocuments = [
        'businessRegCert',
        'facilityLicense',
        'taxID'
    ];

    // check if the document type is valid
    if (!allowedDocuments.includes(documentType)) {
        throw new Error('Invalid document type');
    }

    // admin can only verify or reject
    const allowedStatuses = [
        'verified',
        'rejected'
    ];

    // check if the status is valid
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid verification status');
    }

    // if admin is rejecting the document,
    // a comment must be provided
    if (
        status === 'rejected' &&
        (!comment || comment.trim() === '')
    ) {
        throw new Error(
            'A comment is required when rejecting a document'
        );
    }

    // find the facility
    const facility = await Facility.findById(facilityId);

    if (!facility) {
        throw new Error('Facility not found');
    }

    const document = facility[documentType];

    if (!document === 'proofOfLocation') {
        throw new Error('Document has not been uploaded');
    }

    const urlField = `${documentType}_URL`;

    if (!document[urlField]) {
        throw new Error('Document has not been uploaded');
    } 
   
    document.verificationStatus = status;

    // save the admin's comment
    if (status === 'rejected') {

        document.verificationComment = comment.trim();
    } else {
        // clear any previous rejection comment
        document.verificationComment = '';
    }

    // record when the document was reviewed
    document.verifiedAt = new Date();

    await facility.save();

    // return the updated facility
    const updatedFacility = await Facility.findById(
        facility._id
    ).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedFacility;
};

// handles verification or sending the entire facility back to pending
const updateFacilityVerificationStatus = async (
    facilityId,
    status,
    comment
) => {

    // admin can either verify or send the facility back to pending
    const allowedStatuses = [
        'verified',
        'pending'
    ];

    // check if the status is valid
    if (!allowedStatuses.includes(status)) {
        throw new Error(
            'Invalid verification status. Only verified or pending are allowed.'
        );
    }

    // if admin is sending the facility back to pending,
    // a comment must be provided
    if (
        status === 'pending' &&
        (!comment || comment.trim() === '')
    ) {
        throw new Error(
            'A comment is required when sending a facility back to pending'
        );
    }

    // find the facility
    const facility = await Facility.findById(facilityId);

    if (!facility) {
        throw new Error('Facility not found');
    }

    // before verifying the facility,
    // make sure all required documents have been verified
    if (status === 'verified') {

        if (
            facility.businessRegCert?.verificationStatus !== 'verified' ||
            facility.facilityLicense?.verificationStatus !== 'verified' ||
            facility.taxID?.verificationStatus !== 'verified'
        ) {
            throw new Error(
                'All facility documents must be verified before the facility can be verified'
            );
        }
    }

    // update the overall facility verification status
    facility.verificationStatus = status;

    // save the admin's comment
    if (status === 'pending') {

        facility.verificationComment = comment.trim();

        // remove the previous verification date
        facility.verifiedAt = undefined;

    } else {

        // clear any previous pending/rejection comment
        facility.verificationComment = '';

        // record when the facility was verified
        facility.verifiedAt = new Date();
    }

    await facility.save();

    // return the updated facility
    const updatedFacility = await Facility.findById(
        facility._id
    ).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedFacility;
};

export default { getAllWorkers, getWorkerById, updateWorkerDocumentStatus, getAllFacilities, getPendingFacilities, getFacilityById, updateFacilityDocumentStatus, updateFacilityVerificationStatus };