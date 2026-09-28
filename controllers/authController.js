import { registerWorker, loginWorker } from '../services/workerService.js';

const registerWorkerController = async (req, res) => {
    try{
        const result = await registerWorker(req, res);
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

const loginWorkerController = async (req, res) => {
    try{
        const result = await loginWorker(req, res);
        res.status(200).json({
            messgae: 'Login successful',
            data: result
        })
    } catch(error) {
        res.status(401).json({
            message: error.message
        })
    }
};

export { registerWorkerController, loginWorkerController };