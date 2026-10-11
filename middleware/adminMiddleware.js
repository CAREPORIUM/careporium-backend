import User from '../models/userModel.js';

// checks if the logged-in user is an admin
const adminMiddleware = async (req, res, next) => {
    try {
        // check if the authenticated user exists
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // find the user in the database
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // check if the user is an admin
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        // allow the request to continue
        next();

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export {
    adminMiddleware
};