// Role-based authorization middleware factory.
// Usage: requireRole("facility") — returns a middleware that only lets requests
// through when the authenticated user's role matches. Requires authMiddleware
// to have already run so that req.user exists.
// Returns 403 "Access denied" when the role does not match.
const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    // Role matches — allow the request to continue to the route handler.
    next();
};

export { requireRole };