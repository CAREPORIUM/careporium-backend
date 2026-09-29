import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Facility from "../models/Facility.js";
import Professional from "../models/Professional.js";
import User from "../models/User.js";

const createError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const publicUser = (user) => ({
    id: String(user._id),
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified
});

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw createError("Authentication is not configured", 500);
    }

    return jwt.sign(
        { id: String(user._id), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );
};

export const registerWorker = async (data) => {
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const phoneNumber = typeof data.phoneNumber === "string" ? data.phoneNumber.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const fullName = data.fullname || data.fullName;

    if (!email || !phoneNumber || !password || !fullName) {
        throw createError("fullname, email, phoneNumber, and password are required");
    }
    if (password.length < 8) {
        throw createError("Password must be at least 8 characters long");
    }
    if (await User.exists({ email })) {
        throw createError("Email already exists", 409);
    }

    const user = await User.create({
        email,
        phoneNumber,
        password: await bcrypt.hash(password, 12),
        role: "worker"
    });

    try {
        const professional = await Professional.create({
            userId: user._id,
            fullName,
            title: data.profession || "Healthcare Professional",
            specialty: data.specialty || "General",
            experienceYears: data.yearsOfExperience ?? 0,
            location: data.location || {},
            skills: data.skills || []
        });

        return {
            user: publicUser(user),
            professional: { id: String(professional._id), ...professional.toObject() }
        };
    } catch (error) {
        await User.deleteOne({ _id: user._id });
        throw error;
    }
};

export const login = async ({ email, password }) => {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.password))) {
        throw createError("Invalid email or password", 401);
    }

    return { token: createToken(user), user: publicUser(user) };
};

export const registerFacility = async (data) => {
    const businessEmail = typeof data.businessEmail === "string"
        ? data.businessEmail.trim().toLowerCase()
        : "";
    const password = typeof data.password === "string" ? data.password : "";
    const requiredFields = ["facilityName", "facilityType", "taxID", "adminName", "phoneNumber"];

    if (!businessEmail || !password || requiredFields.some((field) => !data[field])) {
        throw createError("facilityName, facilityType, taxID, businessEmail, adminName, phoneNumber, and password are required");
    }
    if (password.length < 8) {
        throw createError("Password must be at least 8 characters long");
    }
    if (await User.exists({ email: businessEmail })) {
        throw createError("Email already exists", 409);
    }

    const user = await User.create({
        email: businessEmail,
        phoneNumber: data.phoneNumber,
        password: await bcrypt.hash(password, 12),
        role: "facility"
    });

    try {
        const facility = await Facility.create({
            userId: user._id,
            facilityName: data.facilityName,
            facilityType: data.facilityType,
            taxID: data.taxID,
            businessEmail,
            adminName: data.adminName,
            phoneNumber: data.phoneNumber
        });

        return { user: publicUser(user), facility };
    } catch (error) {
        await User.deleteOne({ _id: user._id });
        throw error;
    }
};