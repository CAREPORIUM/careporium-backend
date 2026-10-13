import { registerWorker, registerFacility, verifyAccount, resendVerificationOtp,
         loginUser, logoutUser, getProfile, forgotPassword, verifyResetCode, resendResetCode, 
         resetPassword, deleteUser } from '../services/authService.js';

// handles worker's registeration
// worker registration
const registerWorkerController = async (req, res) => {
  try {
    const result = await registerWorker(req.body);

    res.status(201).json({
      message:
        "Account created successfully. Please check your email for your verification code.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// handles facility's registration
const registerFacilityController = async (req, res) => {
  try {
    const result = await registerFacility(req, res);
    /* * if (!req.file) {
            return res.status(400).json({
                message: 'File is required. Please upload the required document.'
            });
        } */

    res.status(201).json({
      message: "Facility account has been created successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// receives the worker registration request and passes the request data to the...
// ...registerWorker service in authService.js, which handles the registration logic

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

// login user
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

// logout user
const logoutUserController = async (req, res) => {

    try {

        const result = await logoutUser(req.user.id);

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// get user profile
const getProfileController = async (req, res) => {
    try {
        const user = await getProfile(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// forgot password
const forgotPasswordController = async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const result = await forgotPassword(email);

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
  }

// verify password reset OTP
const verifyResetCodeController = async (req, res) => {

    try {

        const { otp } = req.body;

        const result = await verifyResetCode(otp);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: {
                resetToken: result.resetToken,
                expiresIn: result.expiresIn
            }
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

// resend password reset OTP
const resendResetCodeController = async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const result = await resendResetCode(email);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

// reset password
const resetPasswordController = async (req, res) => {

    try {

        const authorization = req.headers.authorization;

        const resetToken = authorization?.startsWith('Bearer ')
            ? authorization.slice(7)
            : null;

        const { newPassword } = req.body;

        const result = await resetPassword(
            resetToken,
            newPassword
        );

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

// delete user's profile
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

export { registerWorkerController,
    registerFacilityController,
    verifyAccountController,
    resendVerificationOtpController,
    loginUserController,
    logoutUserController,
    getProfileController,
    forgotPasswordController,
    verifyResetCodeController,
    resendResetCodeController,
    resetPasswordController,
    deleteUserController
};