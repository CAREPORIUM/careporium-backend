import jwt from "jsonwebtoken";

// authenticates user before authorization (allowing access to protected routes)
const authMiddleware = (req, res, next) => {

    try {
        // get the authorization header from the request
        const authHeader = req.headers.authorization;

        // stop the request if no authorization header was provided
        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header missing"
            });
        }

        // extract the token from "Bearer <token>"
        const token = authHeader.split(" ")[1];

        // stop the request if a token was not provided
        if (!token) {
            return res.status(401).json({
                message: "Token missing"
            });
        }

        // verify that the token is valid and has not expired
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // store the decoded user information so the controller/service can identify the user making the request
        req.user = decoded;

        // token is valid, so allow the request to continue
        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export { authMiddleware };