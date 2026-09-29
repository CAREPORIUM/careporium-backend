import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const setAuthenticatedUser = (req, res) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Use a Bearer token for authentication" });
        return null;
    }

    const token = authorization.slice(7);
    if (!process.env.JWT_SECRET) {
        res.status(500).json({ message: "Authentication is not configured" });
        return null;
    }

    try {
        // Accept common user-ID claim names used by JWT issuers.
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload.sub || payload.id || payload._id;

        if (!mongoose.isValidObjectId(userId)) {
            res.status(401).json({ message: "Invalid authentication token" });
            return null;
        }

        req.user = { id: String(userId) };
        return true;
    } catch {
        res.status(401).json({ message: "Invalid or expired authentication token" });
        return null;
    }
};

export const authenticate = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
    }

    if (setAuthenticatedUser(req, res)) next();
};

// Allow anonymous reads, but validate credentials when the caller provides a token.
export const optionalAuthenticate = (req, res, next) => {
    if (!req.headers.authorization) return next();
    if (setAuthenticatedUser(req, res)) next();
};

// Keep the name used by the team's auth routes available as an alias.
export const authMiddleware = authenticate;