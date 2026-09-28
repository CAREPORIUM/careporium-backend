import Worker from '../models/workerModel.js';

const getWorkerProfile = async (userId) => {
    const worker = await Worker.findOne({ user: userId });

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

const updateWorkerProfile = async (userId, updateData) => {
    const worker = await Worker.findOneAndUpdate(
        { user: userId },
        updateData,
        {
            new: true,
            runValidators: true
        }
    );

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

export { getWorkerProfile, updateWorkerProfile };