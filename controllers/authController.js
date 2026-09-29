import { asyncWrapProviders } from "async_hooks";
import {
  registerWorker,
  loginWorker,
  registerFacility,
} from "../services/authservice.js";
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
      data: asyncWrapProviders,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
import { registerWorker, loginWorker } from '../services/authService.js';

// receives the worker registration request and passes the request data to the...
// ...registerWorker service in authService.js, which handles the registration logic 
const registerWorkerController = async (req, res) => {
    try{
        const result = await registerWorker(req.body);
        res.status(201).json({
            message: 'Account has been created successfully',
            data: result
        });
    } catch(error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// receives the worker login request and passes the login data to the...
// ...loginWorker service in authService, which handles authentication and token generation.
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
