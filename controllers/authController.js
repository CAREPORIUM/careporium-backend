import { login, registerFacility, registerWorker } from "../services/authService.js";

export const registerWorkerController = async (req, res, next) => {
    try {
        const data = await registerWorker(req.body);
        res.status(201).json({ message: "Account created successfully", data });
    } catch (error) {
        next(error);
    }
};

export const loginController = async (req, res, next) => {
    try {
        const data = await login(req.body);
        res.json({ message: "Login successful", data });
    } catch (error) {
        next(error);
    }
};

export const registerFacilityController = async (req, res, next) => {
    try {
        const data = await registerFacility(req.body);
        res.status(201).json({ message: "Facility account created successfully", data });
    } catch (error) {
        next(error);
    }
};