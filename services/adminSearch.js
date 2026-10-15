const MAX_LIMIT = 50;
const MAX_OFFSET = 100000;

// verification states shared by every worker/facility document
const VERIFICATION_STATUSES = ["pending", "verified", "rejected"];

// worker documents an admin can filter on
const WORKER_DOCUMENTS = [
    "professionalLicense",
    "idDocument",
    "educationCert",
    "proofOfLocation"
];

// facility documents an admin can filter on
const FACILITY_DOCUMENTS = ["businessRegCert", "facilityLicense", "taxID"];

// paths to each worker document's verification status
const WORKER_DOCUMENT_STATUS_PATHS = {
    professionalLicense: "certifications.professionalLicense.verificationStatus",
    idDocument: "certifications.idDocument.verificationStatus",
    educationCert: "certifications.educationCert.verificationStatus",
    proofOfLocation: "proofOfLocation.verificationStatus"
};

// paths to each facility document's verification status
const FACILITY_DOCUMENT_STATUS_PATHS = {
    businessRegCert: "businessRegCert.verificationStatus",
    facilityLicense: "facilityLicense.verificationStatus",
    taxID: "taxID.verificationStatus"
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// validates a free-text/exact string filter (max 100 chars, no empty strings)
const readTextFilter = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 100) {
        throw Object.assign(new Error(`${name} must be a non-empty string up to 100 characters`), { statusCode: 400 });
    }
    return value.trim();
};

// validates a value against a fixed set of allowed options
const readEnumFilter = (value, name, allowed) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw Object.assign(new Error(`${name} must be one of: ${allowed.join(", ")}`), { statusCode: 400 });
    }
    return value;
};

// validates a boolean filter supplied as "true"/"false"
const readBooleanFilter = (value, name) => {
    if (value === undefined) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    throw Object.assign(new Error(`${name} must be "true" or "false"`), { statusCode: 400 });
};

// validates a non-negative numeric filter (used for experience ranges)
const readNumberFilter = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) {
        throw Object.assign(new Error(`${name} must be a non-negative number`), { statusCode: 400 });
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw Object.assign(new Error(`${name} must be a non-negative number`), { statusCode: 400 });
    }
    return parsed;
};

// validates a one-based page number and a bounded results-per-page value
const readInteger = (value, name, fallback, maximum) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw Object.assign(new Error(`${name} must be an integer from 1 to ${maximum}`), { statusCode: 400 });
    }
    return parsed;
};

// validates pagination and returns the resolved page/limit pair
const readPagination = (params) => {
    const page = readInteger(params.page, "page", 1, MAX_OFFSET);
    const limit = readInteger(params.limit, "limit", 20, MAX_LIMIT);
    if ((page - 1) * limit > MAX_OFFSET) {
        throw Object.assign(new Error(`page and limit cannot exceed an offset of ${MAX_OFFSET}`), { statusCode: 400 });
    }
    return { page, limit };
};

// turns a verificationStatus (+ optional documentType) into a Mongo match fragment
const buildVerificationFilter = (params, statusPaths) => {
    const status = readEnumFilter(params.verificationStatus, "verificationStatus", VERIFICATION_STATUSES);
    const documentType = readEnumFilter(params.documentType, "documentType", Object.keys(statusPaths));

    if (documentType && !status) {
        throw Object.assign(new Error("verificationStatus is required when filtering by documentType"), { statusCode: 400 });
    }
    if (!status) return undefined;

    // target a single document when a documentType is supplied
    if (documentType) {
        return { [statusPaths[documentType]]: status };
    }
    // otherwise match records where ANY document has the requested status
    return { $or: Object.values(statusPaths).map((path) => ({ [path]: status })) };
};

// appends a yearsOfExperience range filter to the given match object
const applyExperienceFilter = (match, params) => {
    const minExperience = readNumberFilter(params.minExperience, "minExperience");
    const maxExperience = readNumberFilter(params.maxExperience, "maxExperience");
    if (minExperience !== undefined && maxExperience !== undefined && minExperience > maxExperience) {
        throw Object.assign(new Error("minExperience cannot be greater than maxExperience"), { statusCode: 400 });
    }
    if (minExperience !== undefined) match.yearsOfExperience = { ...(match.yearsOfExperience || {}), $gte: minExperience };
    if (maxExperience !== undefined) match.yearsOfExperience = { ...(match.yearsOfExperience || {}), $lte: maxExperience };
};

// builds the aggregation pipeline that searches/filters workers for the admin
export const buildWorkerSearchPipeline = (params = {}) => {
    const match = {};

    const profession = readTextFilter(params.profession, "profession");
    if (profession) match.profession = profession;
    const specialty = readTextFilter(params.specialty, "specialty");
    if (specialty) match.specialty = specialty;
    const state = readTextFilter(params.state, "state");
    if (state) match["location.state"] = state;

    applyExperienceFilter(match, params);

    const verificationFilter = buildVerificationFilter(params, WORKER_DOCUMENT_STATUS_PATHS);
    if (verificationFilter) Object.assign(match, verificationFilter);

    const { page, limit } = readPagination(params);

    // free-text and account-verification filters need the joined user document
    const query = readTextFilter(params.q, "q");
    const isVerified = readBooleanFilter(params.isVerified, "isVerified");
    const postLookupFilter = {};
    if (query) {
        const matcher = new RegExp(escapeRegExp(query), "i");
        postLookupFilter.$or = [
            { fullName: matcher },
            { profession: matcher },
            { specialty: matcher },
            { "user.email": matcher }
        ];
    }
    if (isVerified !== undefined) postLookupFilter["user.isVerified"] = isVerified;

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" }
    ];
    if (Object.keys(postLookupFilter).length > 0) pipeline.push({ $match: postLookupFilter });

    return { pipeline, page, limit };
};

// builds the aggregation pipeline that searches/filters facilities for the admin
export const buildFacilitySearchPipeline = (params = {}) => {
    const match = {};

    const facilityType = readTextFilter(params.facilityType, "facilityType");
    if (facilityType) match.facilityType = facilityType;
    const city = readTextFilter(params.city, "city");
    if (city) match["location.city"] = city;
    const state = readTextFilter(params.state, "state");
    if (state) match["location.state"] = state;

    const verificationFilter = buildVerificationFilter(params, FACILITY_DOCUMENT_STATUS_PATHS);
    if (verificationFilter) Object.assign(match, verificationFilter);

    const { page, limit } = readPagination(params);

    // free-text and account-verification filters need the joined user document
    const query = readTextFilter(params.q, "q");
    const isVerified = readBooleanFilter(params.isVerified, "isVerified");
    const postLookupFilter = {};
    if (query) {
        const matcher = new RegExp(escapeRegExp(query), "i");
        postLookupFilter.$or = [
            { facilityName: matcher },
            { facilityType: matcher },
            { "location.city": matcher },
            { "user.email": matcher }
        ];
    }
    if (isVerified !== undefined) postLookupFilter["user.isVerified"] = isVerified;

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" }
    ];
    if (Object.keys(postLookupFilter).length > 0) pipeline.push({ $match: postLookupFilter });

    return { pipeline, page, limit };
};

