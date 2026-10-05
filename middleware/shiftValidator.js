import { body, validationResult } from "express-validator";

const validateShift = [
    // Validate the required fields before the request reaches the controller.
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

    body("responsibilities")
        .trim()
        .notEmpty()
        .withMessage("Responsibilities are required"),

    body("requiredCredentials")
        .trim()
        .notEmpty()
        .withMessage("Required credentials are required"),

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

    body("professionalsNeeded")
        .isInt({ min: 1 })
        .withMessage("Professionals needed must be at least 1"),

    body("minimumExperience")
        .isInt({ min: 0 })
        .withMessage("Minimum experience cannot be negative"),

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

    body("arrivalInstructions")
        .optional()
        .trim(),

    body("payRate")
        .isFloat({ min: 0 })
        .withMessage("Pay rate must be a valid number"),

    body("isUrgent")
        .optional()
        .isBoolean()
        .withMessage("isUrgent must be a boolean"),

    (req, res, next) => {
        // Collect any validation errors from the checks above.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Stop invalid requests before they reach the controller.
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        // Continue to the controller when all validation checks pass.
        next();
    }
];

export { validateShift };