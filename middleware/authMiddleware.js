import jwt from "jsonwebtoken";
import User from "../models/userModel.js"

// authenticates user before authorization (allowing access to protected routes)
const authMiddleware = async (req, res, next) => {
  try {
    // get the authorization header from the request
    const authHeader = req.headers.authorization;

    // stop the request if no authorization header was provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // extract the token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

     // verify that the token is valid and has not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
          .select('role tokenVersion')
    // stop the request if a token was not provided
    if (!user) {
      return res.status(401).json({
        message: "User account not found"
      });
    }

    // Reject tokens invalidated by logout or password reset
    if (
      (decoded.tokenVersion ?? 0) !==
      (user.tokenVersion ?? 0)
    ) {
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
        });
      }
      // Attach authenticated user to request
      req.user = {
          id: user._id.toString(),
          role: user.role
      };

      next();
    } catch (error) {
          return res.status(401).json({
          message: "Invalid or expired token",
      });
    }
  };

export { authMiddleware };
