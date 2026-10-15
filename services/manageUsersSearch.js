import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";

// filter tabs shown on the Manage Users page
const TABS = ["all", "workers", "facilities", "verified", "suspended"];

// sort orders for the accounts table
const SORT_ORDERS = ["newest", "oldest"];

// account access states (defaults to "active" when the user has no accessStatus yet)
const ACCESS_STATES = ["active", "restricted", "suspended"];

// validates a value against a fixed set of allowed options
const readEnumFilter = (value, name, allowed, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw Object.assign(new Error(`${name} must be one of: ${allowed.join(", ")}`), { statusCode: 400 });
    }
    return value;
};

// validates a free-text search term (non-empty, bounded length)
const readTextFilter = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !value.trim()) {
        throw Object.assign(new Error(`${name} must be a non-empty string`), { statusCode: 400 });
    }
    if (value.length > 100) {
        throw Object.assign(new Error(`${name} must be 100 characters or fewer`), { statusCode: 400 });
    }
    return value.trim();
};

// validates pagination integers
const readInteger = (value, name, fallback, maximum) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw Object.assign(new Error(`${name} must be an integer from 1 to ${maximum}`), { statusCode: 400 });
    }
    return parsed;
};

// escapes regex special characters so free-text search cannot be abused
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// builds a short, human-readable account id from a document id (e.g. WK-1048)
const buildAccountId = (prefix, id) => `${prefix}-${String(id).slice(-4)}`;

// maps a Worker document to a unified account row for the table
const toWorkerRow = (worker) => ({
    _id: worker._id,
    type: "worker",
    account: worker.fullName,
    role: "Worker",
    email: worker.user?.email || null,
    verification: worker.verificationStatus === "verified" ? "Verified" : "Pending",
    access: worker.user?.accessStatus || "active",
    accountId: buildAccountId("WK", worker._id),
    verifiedAt: worker.verifiedAt || null,
    createdAt: worker.createdAt
});

// maps a Facility document to a unified account row for the table
const toFacilityRow = (facility) => ({
    _id: facility._id,
    type: "facility",
    account: facility.facilityName,
    role: "Facility",
    email: facility.user?.email || null,
    verification: facility.verificationStatus === "verified" ? "Verified" : "Pending",
    access: facility.user?.accessStatus || "active",
    accountId: buildAccountId("FC", facility._id),
    verifiedAt: facility.verifiedAt || null,
    createdAt: facility.createdAt
});

// applies the active tab filter to a set of unified rows
const matchesTab = (row, tab) => {
    switch (tab) {
        case "workers":
            return row.type === "worker";
        case "facilities":
            return row.type === "facility";
        case "verified":
            return row.verification === "Verified";
        case "suspended":
            return row.access === "suspended";
        default:
            return true; // "all"
    }
};

// pure function: turns fetched records + params into the filtered/sorted table + counts
const buildManageUsers = (workers, facilities, params = {}) => {
    const q = readTextFilter(params.q, "q");
    const tab = readEnumFilter(params.tab, "tab", TABS, "all");
    const sort = readEnumFilter(params.sort, "sort", SORT_ORDERS, "newest");

    // build one unified row per worker and facility
    const rows = [...workers.map(toWorkerRow), ...facilities.map(toFacilityRow)];

    // apply free-text search across account name, email and account id
    let filtered = rows;
    if (q) {
        const matcher = new RegExp(escapeRegExp(q), "i");
        filtered = filtered.filter(
            (row) =>
                matcher.test(row.account) ||
                matcher.test(row.email || "") ||
                matcher.test(row.accountId)
        );
    }

    // compute the per-tab counts BEFORE applying the active tab, so the badges
    // reflect what each tab would show for the current search
    const counts = {
        all: filtered.length,
        workers: filtered.filter((row) => matchesTab(row, "workers")).length,
        facilities: filtered.filter((row) => matchesTab(row, "facilities")).length,
        verified: filtered.filter((row) => matchesTab(row, "verified")).length,
        suspended: filtered.filter((row) => matchesTab(row, "suspended")).length
    };

    // apply the active tab filter to the visible rows
    const visible = filtered.filter((row) => matchesTab(row, tab));

    // sort newest/oldest by account creation date
    visible.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort === "oldest" ? diff : -diff;
    });

    return { rows: visible, counts, filters: { q: q || null, tab, sort } };
};

// DB entry: fetch workers + facilities (lean, user joined), build, then paginate
const getManageUsersSearch = async (params = {}) => {
    const page = readInteger(params.page, "page", 1, 100000);
    const limit = readInteger(params.limit, "limit", 20, 50);

    const [workers, facilities] = await Promise.all([
        Worker.find({})
            .select("fullName verificationStatus verifiedAt createdAt user")
            .populate({ path: "user", select: "email accessStatus" })
            .lean(),
        Facility.find({})
            .select("facilityName verificationStatus verifiedAt createdAt user")
            .populate({ path: "user", select: "email accessStatus" })
            .lean()
    ]);

    const { rows, counts, filters } = buildManageUsers(workers, facilities, params);

    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);

    return {
        data,
        counts,
        filters,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 }
    };
};

export {
    buildManageUsers,
    getManageUsersSearch,
    matchesTab,
    toWorkerRow,
    toFacilityRow,
    buildAccountId,
    TABS,
    SORT_ORDERS
};

export default { getManageUsersSearch };


