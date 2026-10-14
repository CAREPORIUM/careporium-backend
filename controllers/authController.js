// ---------------------------------------------------------------------------
// Authentication controllers
// ---------------------------------------------------------------------------
// Thin HTTP layer for auth endpoints. Each handler reads the request body,
// calls the matching authService function, and returns a JSON response with a
// friendly message. All auth logic (hashing, OTP, JWT) lives in authService.
// ---------------------------------------------------------------------------
import {
    registerWorker,
    registerFacility,
    verifyAccount,
    resendVerificationOtp,
    loginUser,
    deleteUser
} from '../services/authService.js';

// POST /register/worker — create a new worker account.
const registerWorkerController = async (req, res) => {
    try {
        const result = await registerWorker(req.body);

        res.status(201).json({
            message: 'Account created successfully. Please check your email for your verification code.',
            data: result
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};


// POST /register/facility — create a new facility account.
// Requires at least one uploaded document (checked here before calling the
// service, which reads the full set of uploaded files off req).
const registerFacilityController = async (req, res) => {
    try {

        // Guard: the route uses upload.fields(), which stores files in
        // req.files (plural), NOT req.file. Validate the three required
        // documents here; the service re-checks this too.
        if (
            !req.files ||
            !req.files.businessRegCert ||
            !req.files.facilityLicense ||
            !req.files.TaxID
        ) {
            return res.status(400).json({
                message: 'Business registration certificate, facility license and Tax ID are required.'
            });
        }

        const result = await registerFacility(req, res);

        res.status(201).json({
            message: 'Facility account has been created successfully',
            data: result
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};


// POST /verify-account — verify the OTP sent to the user's email.
const verifyAccountController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const result = await verifyAccount(email, otp);

        res.status(200).json({
            message: 'Account verified successfully. You can proceed to log into your account.',
            data: result
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};


// POST /resend-otp — resend the verification OTP in case the
// user did not receive it the first time.
const resendVerificationOtpController = async (req, res) => {
    try {
        const { email } = req.body;

        const result = await resendVerificationOtp(email);

        res.status(200).json({
            message: 'A new verification code has been sent to your email',
            data: result
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};


// POST /login — authenticate a user and return a JWT.
const loginUserController = async (req, res) => {
    try {
        const result = await loginUser(req.body);

        res.status(200).json({
            message: 'Login successful',
            data: result
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};


// DELETE /delete-profile/:userId — delete a user account and its profile.
const deleteUserController = async (req, res) => {
    try {
        const result = await deleteUser(req.params.userId);

        res.status(200).json(result);

    } catch (error) {

        // Return a clean 404 when the account simply does not exist.
        if (error.message === 'User not found') {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(500).json({
            message: 'Failed to delete user',
            error: error.message
        });
    }
};


export {
    registerWorkerController,
    registerFacilityController,
    verifyAccountController,
    resendVerificationOtpController,
    loginUserController,
    deleteUserController
};