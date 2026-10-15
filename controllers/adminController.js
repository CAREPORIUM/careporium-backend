
import adminService from '../services/adminService.js';

// handles request to retrieve all workers
const getWorkers = async (req, res) => {
    try {
        const workers = await adminService.getAllWorkers();

        res.status(200).json({
            success: true,
            data: workers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve one worker
const getOneWorker = async (req, res) => {
    try {
        const worker = await adminService.getWorkerById(req.params.workerId);

        res.status(200).json({
            success: true,
            data: worker
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: "Not found" 
        });
    }
};


// handles request to verify or reject a worker document
const updateWorkerDocStatus = async (req, res) => {
    try {
        const { documentType, status, comment } = req.body;

        const worker = await adminService.updateWorkerDocumentStatus(
            req.params.workerId,
            documentType,
            status,
            comment
        );

        res.status(200).json({
            success: true,
            message: `Document ${status} successfully`,
            data: worker
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve all facilities
const getFacilities = async (req, res) => {
    try {
        const facilities = await adminService.getAllFacilities();

        res.status(200).json({
            success: true,
            data: facilities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve all pending facilities
const getPendingFacilities = async (req, res) => {
    try {
        const facilities = await adminService.getPendingFacilities();

        res.status(200).json({
            success: true,
            data: facilities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve one facility
const getOneFacility = async (req, res) => {
    try {
        const facility = await adminService.getFacilityById(
            req.params.facilityId
        );

        res.status(200).json({
            success: true,
            data: facility
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: "Not found" 
        });
    }
};


// handles request to verify or reject a facility document
const updateFacilityDocStatus = async (req, res) => {
    try {
        const { documentType, status, comment } = req.body;

        const facility = await adminService.updateFacilityDocumentStatus(
            req.params.facilityId,
            documentType,
            status,
            comment
        );

        res.status(200).json({
            success: true,
            message: `Document ${status} successfully`,
            data: facility
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// handles request to retrieve all pending workers
const getPendingWorkers = async (req, res) => {
    try {
        const workers = await adminService.getPendingWorkers();

        res.status(200).json({
            success: true,
            data: workers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve the combined verification queue
const getVerificationQueue = async (req, res) => {
    try {
        const verificationQueue = await adminService.getVerificationQueue();

        res.status(200).json({
            success: true,
            data: verificationQueue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// handles request to retrieve marketplace overview statistics
const getDashboardStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export default {
    getWorkers,
    getOneWorker,
    updateWorkerDocStatus,
    getFacilities,
    getPendingFacilities,
    getOneFacility,
    updateFacilityDocStatus,
    getPendingWorkers,
    getVerificationQueue,
    getDashboardStats
};