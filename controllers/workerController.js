import Professional from "../models/Professional.js";

const editableFields = [
    "fullName",
    "title",
    "specialty",
    "profileImage",
    "coverImage",
    "bio",
    "experienceYears",
    "experience",
    "skills",
    "location",
    "openToShifts"
];

export const getProfile = async (req, res, next) => {
    try {
        const professional = await Professional.findOne({ userId: req.user.id }).lean();
        if (!professional) return res.status(404).json({ message: "Professional profile not found" });
        res.json({ data: professional });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const updates = Object.fromEntries(
            Object.entries(req.body).filter(([field]) => editableFields.includes(field))
        );
        const professional = await Professional.findOneAndUpdate(
            { userId: req.user.id },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!professional) return res.status(404).json({ message: "Professional profile not found" });
        res.json({ data: professional });
    } catch (error) {
        next(error);
    }
};