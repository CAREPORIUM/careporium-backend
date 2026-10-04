import Shift from "../models/shiftModel.js";
import { buildShiftSearchPipeline } from "../services/shiftSearch.js";

export const searchShifts = async (req, res, next) => {
    try {
        const { pipeline, page, limit } = buildShiftSearchPipeline(req.query);
        const [result] = await Shift.aggregate([
            ...pipeline,
            {
                $facet: {
                    shifts: [
                        { $sort: { date: 1, _id: 1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                role: 1,
                                specialty: 1,
                                workType: 1,
                                description: 1,
                                date: 1,
                                startTime: 1,
                                endTime: 1,
                                shiftType: 1,
                                location: 1,
                                payRate: 1,
                                status: 1,
                                isUrgent: 1,
                                facility: {
                                    _id: "$facility._id",
                                    facilityName: "$facility.facilityName",
                                    facilityType: "$facility.facilityType",
                                    location: "$facility.location",
                                },
                            },
                        },
                    ],
                    metadata: [{ $count: "total" }],
                },
            },
        ]);
        const shifts = result?.shifts ?? [];
        const total = result?.metadata[0]?.total ?? 0;

        res.status(200).json({
            message: "Shifts fetched successfully",
            data: shifts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};