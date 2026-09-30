import Worker from '../models/workerModel.js';

// handles retrieval of worker's profile
const getWorkerProfile = async (userId) => {
    const worker = await Worker.findOne({ 
        user: userId 
    }).populate("user", 
                "-password -verificationOtp -verificationOtpExpires");

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

// handles updating of worker's profile 
const updateWorkerProfile = async (userId, updateData) => {
    const worker = await Worker.findOneAndUpdate({ user: userId }, updateData,{ new: true, runValidators: true });

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

export { getWorkerProfile, updateWorkerProfile };