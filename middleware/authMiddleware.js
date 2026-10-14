import jwt from "jsonwebtoken";

// Authentication middleware — runs before authorization (protecting routes).
// Verifies the "Authorization: Bearer <token>" header and, on success, attaches
// the decoded token payload (which includes the user id and role) to req.user.
// Route handlers and services then rely on req.user to identify the caller.
const authMiddleware = (req, res, next) => {

    try {
        // Read the Authorization header from the incoming request.
        const authHeader = req.headers.authorization;

        // Reject the request if no Authorization header was provided.
        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header missing"
            });
        }

        // Extract the token from the "Bearer <token>" format.
        const token = authHeader.split(" ")[1];

        // Reject if the header existed but no token followed "Bearer".
        if (!token) {
            return res.status(401).json({
                message: "Token missing"
            });
        }

        // Verify the token's signature and expiry using the server secret.
        // Throws if the token is invalid or expired.
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store the decoded user info so downstream code can identify the user.
        // Typically contains { id, role }.
        req.user = decoded;

        // Token is valid — pass control to the next middleware/route handler.
        next();

    } catch (error) {

        // Any verification failure (bad signature, expired, malformed) is a 401.
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export { authMiddleware };