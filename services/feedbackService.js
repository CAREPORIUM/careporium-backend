import Feedback from "../models/feedbackModel.js";
import Shift from "../models/shiftModel.js";
import Worker from "../models/workerModel.js";

const submitFeedback = async (userId, shiftId, feedbackData) => {
    const worker = await Worker.findOne({ user: userId });

    if (!worker) {
        throw new Error("Worker profile not found");
    }

    const shift = await Shift.findById(shiftId);

    if (!shift) {
        throw new Error("Shift not found");
    }

    const isAssigned = shift.assignedWorkers.some(
        (workerId) => workerId.toString() === worker._id.toString()
    );

    if (!isAssigned) {
        throw new Error("You are not assigned to this shift");
    }

    if (shift.status !== "completed") {
    throw new Error("Feedback can only be submitted after shift completion");

    }

    const existingFeedback = await Feedback.findOne({
        worker: worker._id,
        shift: shift._id,
    });

    if (existingFeedback) {
        throw new Error("You have already submitted feedback for this shift");
    }

    return Feedback.create({
        worker: worker._id,
        shift: shift._id,
        rating: feedbackData.rating,
        comment: feedbackData.comment,
    });
};

export default { submitFeedback };
