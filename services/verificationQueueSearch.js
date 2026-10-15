import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";

const MAX_LIMIT = 50;
const MAX_OFFSET = 100000;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// applicant types an admin can filter the queue by
const APPLICANT_TYPES = ["all", "workers", "facilities"];

// sort orders for the "Submitted" column
const SORT_ORDERS = ["oldest", "newest"];

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

// worker documents that make up a worker's submission
const WORKER_DOCUMENTS = [
    { key: "professionalLicense", label: "Professional License", get: (w) => w.certifications?.professionalLicense },
    { key: "idDocument", label: "ID Document", get: (w) => w.certifications?.idDocument },
    { key: "educationCert", label: "Education Certificate", get: (w) => w.certifications?.educationCert },
    { key: "proofOfLocation", label: "Proof of Location", get: (w) => w.proofOfLocation }
];

// facility documents that make up a facility's submission
const FACILITY_DOCUMENTS = [
    { key: "businessRegCert", label: "Business Registration", get: (f) => f.businessRegCert },
    { key: "facilityLicense", label: "Facility License", get: (f) => f.facilityLicense },
    { key: "taxID", label: "Tax ID", get: (f) => f.taxID }
];

// a document counts as pending only when it has been uploaded and is awaiting review
const isPending = (document) => Boolean(document?.url) && document.verificationStatus === "pending";

// turns an applicant into a single queue row, or null when it has no pending documents
const toQueueRow = (applicant, type, documents, nameField) => {
    const pending = documents
        .filter((doc) => isPending(doc.get(applicant)))
        .map((doc) => ({ documentType: doc.key, label: doc.label }));

    if (pending.length === 0) return null;

    return {
        _id: applicant._id,
        type,
        name: applicant[nameField],
        profession: type === "worker" ? applicant.profession : undefined,
        submittedAt: applicant.createdAt,
        status: "pending",
        pendingDocuments: pending,
        pendingCount: pending.length
    };
};

// true when a row matches the free-text search across name, facility and submission/account ID
const matchesSearch = (row, matcher) => {
    if (!matcher) return true;
    return matcher.test(row.name || "") || matcher.test(String(row._id));
};

// builds the searchable/filterable/sortable verification queue from raw worker & facility records
export const buildVerificationQueue = (workers = [], facilities = [], params = {}) => {
    const type = readEnumFilter(params.type, "type", APPLICANT_TYPES) ?? "all";
    const sort = readEnumFilter(params.sort, "sort", SORT_ORDERS) ?? "newest";
    const query = readTextFilter(params.q, "q");
    const matcher = query ? new RegExp(escapeRegExp(query), "i") : null;

    // one row per applicant that still has pending documents
    const allRows = [
        ...workers.map((w) => toQueueRow(w, "worker", WORKER_DOCUMENTS, "fullName")),
        ...facilities.map((f) => toQueueRow(f, "facility", FACILITY_DOCUMENTS, "facilityName"))
    ].filter(Boolean);

    // apply the free-text search across the whole queue
    const searched = allRows.filter((row) => matchesSearch(row, matcher));

    // tab counts reflect the current search, across every category
    const counts = {
        all: searched.length,
        workers: searched.filter((row) => row.type === "worker").length,
        facilities: searched.filter((row) => row.type === "facility").length
    };

    // the type filter controls which rows are visible
    const visible =
        type === "workers"
            ? searched.filter((row) => row.type === "worker")
            : type === "facilities"
                ? searched.filter((row) => row.type === "facility")
                : searched;

    // sort by submission date, oldest or newest first
    const sorted = [...visible].sort((a, b) => {
        const diff = new Date(a.submittedAt) - new Date(b.submittedAt);
        return sort === "oldest" ? diff : -diff;
    });

    return {
        data: sorted,
        counts,
        filters: { type, sort, q: query ?? null }
    };
};

// fetches applicants from the database and returns the filtered/sorted queue (paginated)
export const getVerificationQueueSearch = async (params = {}) => {
    const [workers, facilities] = await Promise.all([
        Worker.find().select("fullName profession createdAt certifications proofOfLocation"),
        Facility.find().select("facilityName facilityType createdAt businessRegCert facilityLicense taxID")
    ]);

    const queue = buildVerificationQueue(workers, facilities, params);
    const { page, limit } = readPagination(params);

    const start = (page - 1) * limit;
    return {
        data: queue.data.slice(start, start + limit),
        counts: queue.counts,
        filters: queue.filters,
        pagination: {
            page,
            limit,
            total: queue.data.length,
            totalPages: Math.ceil(queue.data.length / limit)
        }
    };
};

