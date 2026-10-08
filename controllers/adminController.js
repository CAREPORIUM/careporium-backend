import adminService from '../services/adminService.js';

// handles request to retrieve all workers
const getWorkers = async (req, res) => {
    try {
        const workers = await getAllWorkers()
        res.status(200).json({
            success: true,
            data: workers
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

// handles request to retrieve one worker
const getOneWorker = async (req, res) => {
    try {
        const worker = await getWorkerById(req.params.workerId)
        res.status(200).json({
            success: true,
            data: worker
        })
    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        })
    }
};

// handles request to verify or reject a worker document
const updateWorkerDocStatus = async (req, res) => {
    try {
        const { documentType, status, comment } = req.body;

        const worker = await updateWorkerDocumentStatus(
            req.params.workerId, documentType, status, comment
        )

        res.status(200).json({
            success: true,
            message: `Document ${status} successfully`,
            data: worker
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
};

// handles request to retrieve all facilities
const getFacilities = async (req, res) => {
    try {
        const facilities = await getAllFacilities();
        res.status(200).json({
            success: true,
            data: facilities
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

// handles request to retrieve all pending facilities
const getPendingFacilities = async (req, res) => {
    try {
        const facilities = await getPendingFacilities();

        res.status(200).json({
            success: true,
            data: facilities
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

// handles request to retrieve one facility
const getOneFacility = async (req, res) => {
    try {
        const facility = await getFacilityById(
            req.params.facilityId
        )
        res.status(200).json({
            success: true,
            data: facility
        })
    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        })
    }
}

// handles request to verify or reject a facility document
const updateFacilityDocStatus = async (req, res) => {
    try {
        const { documentType, status, comment } = req.body;

        const facility = await updateFacilityDocumentStatus(
            req.params.facilityId, documentType, status, comment
        )

        res.status(200).json({
            success: true,
            message: `Document ${status} successfully`,
            data: facility
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

// handles request to verify or reject an entire facility
const updateFacilityStatus = async (req, res) => {
    try {
        const { status, comment } = req.body;

        const facility = await updateFacilityVerificationStatus(
            req.params.facilityId,
            status,
            comment
        )

        res.status(200).json({
            success: true,
            message: `Facility ${status} successfully`,
            data: facility
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
};

export default { getWorkers, getOneWorker, updateWorkerDocStatus , getFacilities, getPendingFacilities, getOneFacility, updateFacilityDocStatus, updateFacilityStatus };