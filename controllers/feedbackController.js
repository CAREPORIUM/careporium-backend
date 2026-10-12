import feedbackService from "../services/feedbackService.js";

const submitFeedback = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const feedback = await feedbackService.submitFeedback(
            req.user.id,
            shiftId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Feedback submitted successfully.",
            data: feedback,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export default { submitFeedback };
