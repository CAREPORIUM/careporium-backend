import { createNotification } from './notificationService.js';
import Worker from '../models/workerModel.js';
import Facility from '../models/facilityModel.js';
import Shift from '../models/shiftModel.js';
// Retrieve all workers.
const getAllWorkers = async () => {
    return Worker.find().populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Retrieve one worker.
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

// Calculate overall worker verification from required documents.
const updateWorkerVerificationStatus = (worker) => {
    const requiredDocuments = [
        worker.certifications?.professionalLicense,
        worker.certifications?.idDocument,
        worker.certifications?.educationCert,
        worker.proofOfLocation
    ];

    const allDocumentsVerified = requiredDocuments.every(
        (document) =>
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

// Verify or reject an individual worker document.
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

    const document =
        documentType === 'proofOfLocation'
            ? worker.proofOfLocation
            : worker.certifications?.[documentType];

    if (!document?.url) {
        throw new Error('Document has not been uploaded');
    }

    document.verificationStatus = status;
    document.verificationComment =
        status === 'rejected' ? comment.trim() : '';
    document.verifiedAt =
        status === 'verified' ? new Date() : undefined;

    // Save the updated status before creating a notification.
    const wasVerified = worker.verificationStatus === 'verified';

    updateWorkerVerificationStatus(worker);
    await worker.save();

    // Notify only when the overall profile first becomes verified.
    if (!wasVerified && worker.verificationStatus === 'verified') {
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
            console.error(
                'Failed to create worker verification notification:',
                error
            );
        }
    }

    return worker.populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Retrieve all facilities.
const getAllFacilities = async () => {
    return Facility.find().populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Retrieve facilities awaiting verification.
const getPendingFacilities = async () => {
    return Facility.find({
        verificationStatus: 'pending'
    }).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Retrieve one facility.
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

// Calculate overall facility verification from required documents.
const updateFacilityVerificationStatus = (facility) => {
    const requiredDocuments = [
        facility.businessRegCert,
        facility.facilityLicense,
        facility.taxID
    ];

    const allDocumentsVerified = requiredDocuments.every(
        (document) =>
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

// Verify or reject an individual facility document.
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

    const document = facility[documentType];

    if (!document?.url) {
        throw new Error('Document has not been uploaded');
    }

    document.verificationStatus = status;
    document.verificationComment =
        status === 'rejected' ? comment.trim() : '';
    document.verifiedAt =
        status === 'verified' ? new Date() : undefined;

    // Save the updated status before creating a notification.
    const wasVerified = facility.verificationStatus === 'verified';

    updateFacilityVerificationStatus(facility);
    await facility.save();

    // Notify only when the overall profile first becomes verified.
    if (!wasVerified && facility.verificationStatus === 'verified') {
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
            console.error(
                'Failed to create facility verification notification:',
                error
            );
        }
    }

    return facility.populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Retrieve workers awaiting verification.
const getPendingWorkers = async () => {
    return Worker.find({
        verificationStatus: 'pending'
    }).populate(
        'user',
        '-password -verificationOtp -verificationOtpExpires'
    );
};

// Build the combined queue of pending document verifications.
const getVerificationQueue = async () => {
    const workers = await Worker.find();
    const facilities = await Facility.find();
    const verificationQueue = [];

    workers.forEach((worker) => {
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
                    submittedAt: worker.createdAt
                });
            }
        });
    });

    facilities.forEach((facility) => {
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
                    submittedAt: facility.createdAt
                });
            }
        });
    });

    verificationQueue.sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    return verificationQueue;
};

// Retrieve dashboard statistics.
const getDashboardStats = async () => {
    const totalWorkers = await Worker.countDocuments();

    const verifiedWorkers = await Worker.countDocuments({
        verificationStatus: 'verified'
    });

    const totalFacilities = await Facility.countDocuments();

    const verifiedFacilities = await Facility.countDocuments({
        verificationStatus: 'verified'
    });

    const verificationQueue = await getVerificationQueue();
    const pendingVerifications = verificationQueue.length;

    const activeShifts = await Shift.countDocuments({
        status: {
            $in: ['open', 'filled']
        }
    });

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
