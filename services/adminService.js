import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';
import { createNotification } from "./notificationService.js";


// handles request to retrieve all workers
const getAllWorkers = async () => {

    const workers = await Worker.find().populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return workers;
};


// handles request to retrieve one worker
const getWorkerById = async (workerId) => {

    const worker = await Worker.findById(workerId).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    if (!worker) {
        throw new Error('Worker not found');
    }

    return worker;
};


// updates the worker's verification status based on all required documents
const updateWorkerVerificationStatus = (worker) => {

    const requiredDocuments = [
        worker.certifications?.professionalLicense,
        worker.certifications?.idDocument,
        worker.certifications?.educationCert,
        worker.proofOfLocation
    ];

    const allDocumentsVerified = requiredDocuments.every(
        document =>
            document?.url &&
            document.verificationStatus === 'verified'
    );

    if (allDocumentsVerified) {

        if (worker.verificationStatus !== 'verified') {
            worker.verifiedAt = new Date();
        }

        worker.verificationStatus = 'verified';

    } else {

        worker.verificationStatus = 'pending';
        worker.verifiedAt = undefined;

    }
};


// handles request to verify or reject a worker document
const updateWorkerDocumentStatus = async (
    workerId,
    documentType,
    status,
    comment = ''
) => {

    const allowedDocuments = [
        'professionalLicense',
        'idDocument',
        'educationCert',
        'proofOfLocation'
    ];

    if (!allowedDocuments.includes(documentType)) {
        throw new Error('Invalid worker document type');
    }

    if (!['verified', 'rejected'].includes(status)) {
        throw new Error('Invalid document status');
    }

    if (status === 'rejected' && !comment.trim()) {
        throw new Error('A comment is required when rejecting a document');
    }

    const worker = await Worker.findById(workerId);

    if (!worker) {
        throw new Error('Worker not found');
    }

    // retrieves the selected document from the worker profile
    const document =
        documentType === 'proofOfLocation'
            ? worker.proofOfLocation
            : worker.certifications?.[documentType];

    if (!document?.url) {
        throw new Error('Document has not been uploaded');
    }

    // updates the document verification details
    document.verificationStatus = status;
    document.verificationComment =
        status === 'rejected' ? comment.trim() : '';

    document.verifiedAt =
        status === 'verified' ? new Date() : undefined;

    // checks whether the worker was already verified
    const wasVerified = worker.verificationStatus === 'verified';

    // updates the worker's verification status automatically
    updateWorkerVerificationStatus(worker);

    // save the updated worker document status
    await worker.save();

    // sends a notification when a worker document is approved or rejected
    try {
        await createNotification({
            recipient: worker.user,
            type: 'WORKER_DOCUMENT_STATUS_UPDATED',
            title: status === 'verified'
                ? 'Document approved'
                : 'Document rejected',
            message: status === 'verified'
                ? `Your ${documentType} document has been approved.`
                : `Your ${documentType} document was rejected. Reason: ${comment.trim()}`,
            actionText: 'View verification status',
            actionLink: '/StatusSection/VerificationStatus.html',
            resourceType: 'Worker',
            resourceId: worker._id
        });
    } catch (error) {
        // notification failure should not undo successful document verification
        console.error(
            'Failed to create worker document status notification:',
            error
        );
    }

    // notify the worker when their overall profile becomes verified
    if (
        !wasVerified &&
        worker.verificationStatus === 'verified'
    ) {
        try {
            await createNotification({
                recipient: worker.user,
                type: 'WORKER_VERIFIED',
                title: 'Profile Verified',
                message:
                    'Congratulations! Your professional profile and required documents have been verified.',
                resourceType: 'Worker',
                resourceId: worker._id
            });
        } catch (error) {
            // notification failure should not undo successful worker verification
            console.error(
                'Failed to create worker verification notification:',
                error
            );
        }
    }

    const updatedWorker = await worker.populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedWorker;
};


// handles request to retrieve all facilities
const getAllFacilities = async () => {

    const facilities = await Facility.find().populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return facilities;
};


// handles request to retrieve all pending facilities
const getPendingFacilities = async () => {

    const facilities = await Facility.find({
        verificationStatus: 'pending'
    }).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return facilities;
};


// handles request to retrieve one facility
const getFacilityById = async (facilityId) => {

    const facility = await Facility.findById(facilityId).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    if (!facility) {
        throw new Error('Facility not found');
    }

    return facility;
};


// updates the facility's verification status based on all required documents
const updateFacilityVerificationStatus = (facility) => {

    const requiredDocuments = [
        facility.businessRegCert,
        facility.facilityLicense,
        facility.taxID
    ];

    const allDocumentsVerified = requiredDocuments.every(
        document =>
            document?.url &&
            document.verificationStatus === 'verified'
    );

    if (allDocumentsVerified) {

        if (facility.verificationStatus !== 'verified') {
            facility.verifiedAt = new Date();
        }

        facility.verificationStatus = 'verified';

    } else {

        facility.verificationStatus = 'pending';
        facility.verifiedAt = undefined;

    }
};


// handles request to verify or reject a facility document
const updateFacilityDocumentStatus = async (
    facilityId,
    documentType,
    status,
    comment = ''
) => {

    const allowedDocuments = [
        'businessRegCert',
        'facilityLicense',
        'taxID'
    ];

    if (!allowedDocuments.includes(documentType)) {
        throw new Error('Invalid facility document type');
    }

    if (!['verified', 'rejected'].includes(status)) {
        throw new Error('Invalid document status');
    }

    if (status === 'rejected' && !comment.trim()) {
        throw new Error('A comment is required when rejecting a document');
    }

    const facility = await Facility.findById(facilityId);

    if (!facility) {
        throw new Error('Facility not found');
    }

    // retrieves the selected document from the facility profile
    const document = facility[documentType];

    if (!document?.url) {
        throw new Error('Document has not been uploaded');
    }

    // updates the document verification details
    document.verificationStatus = status;
    document.verificationComment =
        status === 'rejected' ? comment.trim() : '';

    document.verifiedAt =
        status === 'verified' ? new Date() : undefined;

    // checks whether the facility was already verified
    const wasVerified = facility.verificationStatus === 'verified';

    // updates the facility's verification status automatically
    updateFacilityVerificationStatus(facility);

    // save the updated facility document status
    await facility.save();

    // sends a notification when a facility document is approved or rejected
    try {
        await createNotification({
            recipient: facility.user,
            type: 'FACILITY_DOCUMENT_STATUS_UPDATED',
            title: status === 'verified'
                ? 'Document approved'
                : 'Document rejected',
            message: status === 'verified'
                ? `Your ${documentType} document has been approved.`
                : `Your ${documentType} document was rejected. Reason: ${comment.trim()}`,
            actionText: 'View verification status',
            actionLink: '/StatusSection/VerificationStatus.html',
            resourceType: 'Facility',
            resourceId: facility._id
        });
    } catch (error) {
        // notification failure should not undo successful document verification
        console.error(
            'Failed to create facility document status notification:',
            error
        );
    }

    // notify the facility when its overall profile becomes verified
    if (
        !wasVerified &&
        facility.verificationStatus === 'verified'
    ) {
        try {
            await createNotification({
                recipient: facility.user,
                type: 'FACILITY_VERIFIED',
                title: 'Facility Verified',
                message:
                    'Congratulations! Your facility and required documents have been verified.',
                resourceType: 'Facility',
                resourceId: facility._id
            });
        } catch (error) {
            // notification failure should not undo successful facility verification
            console.error(
                'Failed to create facility verification notification:',
                error
            );
        }
    }

    const updatedFacility = await facility.populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return updatedFacility;
};


// handles request to retrieve all pending workers
const getPendingWorkers = async () => {

    const workers = await Worker.find({
        verificationStatus: 'pending'
    }).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );

    return workers;
};


// handles request to retrieve the combined verification queue
const getVerificationQueue = async () => {

    const workers = await Worker.find();

    const facilities = await Facility.find();

    const verificationQueue = [];

    // retrieves individual worker documents awaiting verification
    workers.forEach(worker => {

        const workerDocuments = [
            {
                documentType: 'professionalLicense',
                document: worker.certifications?.professionalLicense
            },
            {
                documentType: 'idDocument',
                document: worker.certifications?.idDocument
            },
            {
                documentType: 'educationCert',
                document: worker.certifications?.educationCert
            },
            {
                documentType: 'proofOfLocation',
                document: worker.proofOfLocation
            }
        ];

        workerDocuments.forEach(({ documentType, document }) => {

            if (
                document?.url &&
                document.verificationStatus === 'pending'
            ) {

                verificationQueue.push({
                    _id: worker._id,
                    type: 'worker',
                    name: worker.fullName,
                    documentType,
                    documentUrl: document.url,
                    documentVerificationStatus: document.verificationStatus,
                    //verificationComment: document.verificationComment,
                    submittedAt: worker.createdAt
                });

            }

        });

    });

    // retrieves individual facility documents awaiting verification
    facilities.forEach(facility => {

        const facilityDocuments = [
            {
                documentType: 'businessRegCert',
                document: facility.businessRegCert
            },
            {
                documentType: 'facilityLicense',
                document: facility.facilityLicense
            },
            {
                documentType: 'taxID',
                document: facility.taxID
            }
        ];

        facilityDocuments.forEach(({ documentType, document }) => {

            if (
                document?.url &&
                document.verificationStatus === 'pending'
            ) {

                verificationQueue.push({
                    _id: facility._id,
                    type: 'facility',
                    name: facility.facilityName,
                    documentType,
                    documentUrl: document.url,
                    documentVerificationStatus: document.verificationStatus,
                    //verificationComment: document.verificationComment,
                    submittedAt: facility.createdAt
                });

            }

        });

    });

    // sorts the queue by newest submission first
    verificationQueue.sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    return verificationQueue;
};


// handles request to retrieve dashboard statistics
const getDashboardStats = async () => {

    // retrieve total number of workers
    const totalWorkers = await Worker.countDocuments();

    // retrieve total number of verified workers
    const verifiedWorkers = await Worker.countDocuments({
        verificationStatus: 'verified'
    });

    // retrieve total number of facilities
    const totalFacilities = await Facility.countDocuments();

    // retrieve total number of verified facilities
    const verifiedFacilities = await Facility.countDocuments({
        verificationStatus: 'verified'
    });

    // retrieve the total number of individual documents awaiting verification
    const verificationQueue = await getVerificationQueue();

    const pendingVerifications = verificationQueue.length;

    // retrieve total number of active shifts
    const activeShifts = await Shift.countDocuments({
        status: {
            $in: ['open', 'filled']
        }
    });

    // retrieve total number of completed shifts
    const completedShifts = await Shift.countDocuments({
        status: 'completed'
    });

    return {
        totalWorkers,
        verifiedWorkers,
        totalFacilities,
        verifiedFacilities,
        pendingVerifications,
        activeShifts,
        completedShifts
    };
};

export default {
    getAllWorkers,
    getWorkerById,
    updateWorkerDocumentStatus,
    getAllFacilities,
    getPendingFacilities,
    getFacilityById,
    updateFacilityDocumentStatus,
    getPendingWorkers,
    getVerificationQueue,
    getDashboardStats
};