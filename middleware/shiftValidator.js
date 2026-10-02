import { body, validationResult } from "express-validator";

const validateShift = [
    body("role")
        .trim()
        .notEmpty()
        .withMessage("Role is required"),

    body("specialty")
        .optional()
        .trim(),

    body("workType")
        .trim()
        .notEmpty()
        .withMessage("Work type is required"),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),

    body("requirements")
        .optional()
        .trim(),

    body("date")
        .isISO8601()
        .withMessage("Valid shift date is required"),

    body("startTime")
        .trim()
        .notEmpty()
        .withMessage("Start time is required"),

    body("endTime")
        .trim()
        .notEmpty()
        .withMessage("End time is required"),

    body("shiftType")
        .trim()
        .notEmpty()
        .withMessage("Shift type is required"),

    body("location")
        .isObject()
        .withMessage("Location is required"),

    body("location.address")
        .trim()
        .notEmpty()
        .withMessage("Location address is required"),

    body("location.city")
        .trim()
        .notEmpty()
        .withMessage("Location city is required"),

    body("location.state")
        .trim()
        .notEmpty()
        .withMessage("Location state is required"),

    body("payRate")
        .isFloat({ min: 0 })
        .withMessage("Pay rate must be a valid number"),

    body("isUrgent")
        .optional()
        .isBoolean()
        .withMessage("isUrgent must be a boolean"),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        next();
    }
];

export { validateShift };