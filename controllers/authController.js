import { asyncWrapProviders } from "async_hooks";
import {
  registerWorker,
  loginWorker,
  registerFacility,
} from "../services/authService.js";
import cloudinary from "../config/cloudinary.js";
const registerWorkerController = async (req, res) => {
  try {
    const result = await registerWorker(req, res);
    res.status(201).json({
      message: "Account has been created successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
//sigup for facility role
const registerFacilityController = async (req, res) => {
  try {
    const answer = await registerFacility(req, res);
    res.status(201).json({
      message: "Facility account has been created successfully",
      data: answer,
    });
    if (!req.file) {
      return res.status(400).json({
        message:
          "file is required to be uploaded....please upload the required file",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const loginWorkerController = async (req, res) => {
  try {
    const result = await loginWorker(req, res);
    res.status(200).json({
      messgae: "Login successful",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      message: error.message,
    });
  }
};

export {
  registerWorkerController,
  loginWorkerController,
  registerFacilityController,
};
