import { body, validationResult } from "express-validator";

const validateShift = [
  // Validate required fields before the controller runs.
  body("profession")
    .trim()
    .notEmpty()
    .withMessage("Profession is required"),

  body("specialty")
    .optional()
    .trim(),

  body("shiftType")
    .trim()
    .notEmpty()
    .withMessage("Shift type is required"),

  body("responsibilities")
    .trim()
    .notEmpty()
    .withMessage("Responsibilities are required"),

  body("reqCredentials")
    .trim()
    .notEmpty()
    .withMessage("Required credentials are required"),

  body("shiftDate")
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

  body("professionalsNeeded")
    .isInt({ min: 1 })
    .withMessage("Professionals needed must be at least 1"),

  body("minimumExperience")
    .isInt({ min: 0 })
    .withMessage("Minimum experience cannot be negative"),

  body("location")
    .trim()
    .notEmpty()
    .withMessage("Location is required"),

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
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    next();
  },
];

export { validateShift };
