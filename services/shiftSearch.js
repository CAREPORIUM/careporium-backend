const MAX_LIMIT = 50;
const MAX_OFFSET = 100000;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const readTextFilter = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 100) {
        throw Object.assign(new Error(`${name} must be a non-empty string up to 100 characters`), { statusCode: 400 });
    }
    return value.trim();
};

const readDate = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw Object.assign(new Error(`${name} must use YYYY-MM-DD format`), { statusCode: 400 });
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw Object.assign(new Error(`${name} must be a valid calendar date`), { statusCode: 400 });
    }
    return date;
};

const readInteger = (value, name, fallback, maximum) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw Object.assign(new Error(`${name} must be an integer from 1 to ${maximum}`), { statusCode: 400 });
    }
    return parsed;
};

export const buildShiftSearchPipeline = (params, now = new Date()) => {
    const shiftFilter = {
        status: "open",
        date: { $gte: now },
    };

    const query = readTextFilter(params.q, "q");
    const profession = readTextFilter(params.profession, "profession");
    if (profession) shiftFilter.role = profession;
    const specialty = readTextFilter(params.specialty, "specialty");
    if (specialty) shiftFilter.specialty = specialty;
    const shiftType = readTextFilter(params.shiftType, "shiftType");
    if (shiftType) shiftFilter.shiftType = shiftType;

    const city = readTextFilter(params.city, "city");
    if (city) shiftFilter["location.city"] = city;
    const state = readTextFilter(params.state, "state");
    if (state) shiftFilter["location.state"] = state;

    if (params.minPay !== undefined) {
        if (typeof params.minPay !== "string" || !/^\d+(?:\.\d+)?$/.test(params.minPay)) {
            throw Object.assign(new Error("minPay must be a non-negative number"), { statusCode: 400 });
        }
        const minPay = Number(params.minPay);
        if (!Number.isFinite(minPay) || minPay < 0) {
            throw Object.assign(new Error("minPay must be a non-negative number"), { statusCode: 400 });
        }
        shiftFilter.payRate = { $gte: minPay };
    }

    const dateFrom = readDate(params.dateFrom, "dateFrom");
    const dateTo = readDate(params.dateTo, "dateTo");
    if (dateFrom && dateTo && dateFrom > dateTo) {
        throw Object.assign(new Error("dateFrom cannot be after dateTo"), { statusCode: 400 });
    }
    if (dateFrom && dateFrom > shiftFilter.date.$gte) shiftFilter.date.$gte = dateFrom;
    if (dateTo) {
        const exclusiveEnd = new Date(dateTo);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        shiftFilter.date.$lt = exclusiveEnd;
    }

    const postLookupFilter = {};
    if (query) {
        const matcher = new RegExp(escapeRegExp(query), "i");
        postLookupFilter.$or = [
            { role: matcher },
            { specialty: matcher },
            { "facility.facilityName": matcher },
        ];
    }

    const page = readInteger(params.page, "page", 1, MAX_OFFSET);
    const limit = readInteger(params.limit, "limit", 20, MAX_LIMIT);
    if ((page - 1) * limit > MAX_OFFSET) {
        throw Object.assign(new Error(`page and limit cannot exceed an offset of ${MAX_OFFSET}`), { statusCode: 400 });
    }
    const pipeline = [
        { $match: shiftFilter },
        {
            $lookup: {
                from: "facilities",
                localField: "facility",
                foreignField: "_id",
                as: "facility",
            },
        },
        { $unwind: "$facility" },
    ];
    if (Object.keys(postLookupFilter).length > 0) pipeline.push({ $match: postLookupFilter });

    return { pipeline, page, limit };
};