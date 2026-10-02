import {
    registerWorker,
    registerFacility,
    verifyAccount,
    resendVerificationOtp,
    loginUser,
    deleteUser
} from '../services/authService.js';

// worker registration 
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


// facility registration
const registerFacilityController = async (req, res) => {
    try {
         const result = await registerFacility(req, res);
       /* * if (!req.file) {
            return res.status(400).json({
                message: 'File is required. Please upload the required document.'
            });
        } */

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


// verify the OTP sent to the user's email
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


// resend verification OTP incase the 
// user did not get OTP the first time
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


// user login
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


// delete user
const deleteUserController = async (req, res) => {
    try {
        const result = await deleteUser(req.params.userId);

        res.status(200).json(result);

    } catch (error) {

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