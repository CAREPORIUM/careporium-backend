import { body, validationResult } from "express-validator";

// Input validation for creating a shift (express-validator rules).
// Each rule documents what the field must contain; required fields use
// .notEmpty() with a friendly message, while optional fields use .optional().
// The final function collects any validation errors and, if present, responds
// with 400 before the request ever reaches the shift service.
const validateShift = [
    // The job role the facility is hiring for (required).
    body("role")
        .trim()
        .notEmpty()
        .withMessage("Role is required"),

    // Optional specialty within the role.
    body("specialty")
        .optional()
        .trim(),

    // Broad category of work (required).
    body("workType")
        .trim()
        .notEmpty()
        .withMessage("Work type is required"),

    // Free-text description of the shift (required).
    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),

    // Optional requirements/qualifications for applicants.
    body("requirements")
        .optional()
        .trim(),

    // Shift date must be a valid ISO 8601 date (required).
    body("date")
        .isISO8601()
        .withMessage("Valid shift date is required"),

    // Start and end times as strings, e.g. "09:00" / "17:00" (required).
    body("startTime")
        .trim()
        .notEmpty()
        .withMessage("Start time is required"),

    body("endTime")
        .trim()
        .notEmpty()
        .withMessage("End time is required"),

    // Shift type, e.g. "day" / "night" (required).
    body("shiftType")
        .trim()
        .notEmpty()
        .withMessage("Shift type is required"),

    // Nested location object with address, city and state (all required).
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

    // Pay rate must be a non-negative number (required).
    body("payRate")
        .isFloat({ min: 0 })
        .withMessage("Pay rate must be a valid number"),

    // Optional boolean flag marking the shift as urgent.
    body("isUrgent")
        .optional()
        .isBoolean()
        .withMessage("isUrgent must be a boolean"),

    // Final handler: if any rule above failed, return 400 with the details;
    // otherwise continue to the controller.
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