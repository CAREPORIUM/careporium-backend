const requireRole = (role) => (req, res, next) => {

    // Check that the authenticated user has the role required by the route.
    if (req.user.role !== role) {

        // Block users who do not have permission to access the route.
        return res.status(403).json({

            message: "Access denied"

        });
    }

    next();

};

export { requireRole };
