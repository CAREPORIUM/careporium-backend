import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";
import Shift from "../models/shiftModel.js";
import Application from "../models/applicationModel.js";
import Payment from "../models/paymentModel.js";

// event types the admin can filter the activity feed by
const EVENT_TYPES = [
    "all",
    "worker_approved",
    "shift_published",
    "payment_release",
    "facility_submitted"
];

// sort orders for the activity feed
const SORT_ORDERS = ["newest", "oldest"];

// validates a value against a fixed set of allowed options
const readEnumFilter = (value, name, allowed, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw Object.assign(new Error(`${name} must be one of: ${allowed.join(", ")}`), { statusCode: 400 });
    }
    return value;
};

// validates a YYYY-MM-DD date and returns it as a string
const readDate = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw Object.assign(new Error(`${name} must use YYYY-MM-DD format`), { statusCode: 400 });
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw Object.assign(new Error(`${name} must be a valid calendar date`), { statusCode: 400 });
    }
    return value;
};

// validates pagination
const readInteger = (value, name, fallback, maximum) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw Object.assign(new Error(`${name} must be an integer from 1 to ${maximum}`), { statusCode: 400 });
    }
    return parsed;
};

// true when an event's date falls inside the requested range (inclusive, date-only)
const inDateRange = (time, dateFrom, dateTo) => {
    if (!time) return false;
    const day = new Date(time).toISOString().slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
};

// maps a payment record to a result label and payout status for the feed
const paymentResult = (payment) => {
    const { payoutStatus, fundingStatus } = payment;
    if (payoutStatus === "paid") return { result: "Success", status: "paid" };
    if (payoutStatus === "failed" || fundingStatus === "failed") return { result: "Failed", status: "failed" };
    if (payoutStatus === "on_hold" || fundingStatus === "refunded") return { result: "On hold", status: "on_hold" };
    return { result: "Pending", status: "pending" };
};

// turns every relevant record into a single unified "event" row
const toEvents = (workers, facilities, shifts, applications, payments) => {
    const events = [];

    // --- Worker approved: (a) verified workers, (b) workers assigned to shifts ---
    workers
        .filter((w) => w.verificationStatus === "verified")
        .forEach((w) => {
            events.push({
                time: w.verifiedAt || w.createdAt,
                eventType: "worker_approved",
                subtype: "verified",
                accountName: w.fullName,
                actor: "Platform admin",
                result: "Success",
                reference: `WK-${String(w._id).slice(-4)}`
            });
        });

    applications
        .filter((a) => a.status === "accepted")
        .forEach((a) => {
            const workerName = a.worker?.fullName || "Worker";
            events.push({
                time: a.updatedAt || a.createdAt,
                eventType: "worker_approved",
                subtype: "assigned",
                accountName: workerName,
                actor: a.shift?.facility?.facilityName || "Facility",
                result: "Success",
                reference: `SH-${String(a.shift?._id || a.shift).slice(-4)}`
            });
        });

    // --- Shift published ---
    shifts.forEach((s) => {
        events.push({
            time: s.createdAt,
            eventType: "shift_published",
            subtype: "shift",
            accountName: s.facility?.facilityName || "Facility",
            actor: s.facility?.facilityName || "Facility",
            result: s.isUrgent ? "Urgent" : "Normal",
            reference: `SH-${String(s._id).slice(-4)}`
        });
    });

    // --- Payment release ---
    payments.forEach((p) => {
        const { result, status } = paymentResult(p);
        events.push({
            time: p.paidAt || p.fundedAt || p.updatedAt || p.createdAt,
            eventType: "payment_release",
            subtype: status,
            accountName: p.facility?.facilityName || "Facility",
            actor: "Platform",
            result,
            reference: `PY-${String(p._id).slice(-4)}`
        });
    });

    // --- Facility submitted ---
    facilities.forEach((f) => {
        events.push({
            time: f.createdAt,
            eventType: "facility_submitted",
            subtype: "facility",
            accountName: f.facilityName,
            actor: f.facilityName,
            result: "Pending",
            reference: `FC-${String(f._id).slice(-4)}`
        });
    });

    return events.filter((e) => e.time);
};

// fetches every source record (lean, joined) then builds the unified event list
const fetchAllEvents = async () => {
    const [workers, facilities, shifts, applications, payments] = await Promise.all([
        Worker.find({}).select("fullName verificationStatus verifiedAt createdAt").lean(),
        Facility.find({}).select("facilityName createdAt").lean(),
        Shift.find({})
            .select("facility isUrgent status createdAt")
            .populate({ path: "facility", select: "facilityName" })
            .lean(),
        Application.find({ status: "accepted" })
            .select("worker shift status updatedAt createdAt")
            .populate({ path: "worker", select: "fullName" })
            .populate({ path: "shift", select: "facility" })
            .populate({ path: "shift.facility", select: "facilityName" })
            .lean(),
        Payment.find({})
            .select("facility fundingStatus payoutStatus paidAt fundedAt updatedAt createdAt")
            .populate({ path: "facility", select: "facilityName" })
            .lean()
    ]);

    return toEvents(workers, facilities, shifts, applications, payments);
};

// applies date-range + event-type filters and newest/oldest sorting
const applyFilters = (events, { eventType, dateFrom, dateTo, sort }) => {
    let filtered = events.filter((e) => inDateRange(e.time, dateFrom, dateTo));

    if (eventType && eventType !== "all") {
        filtered = filtered.filter((e) => e.eventType === eventType);
    }

    filtered.sort((a, b) => {
        const diff = new Date(a.time).getTime() - new Date(b.time).getTime();
        return sort === "oldest" ? diff : -diff;
    });

    return filtered;
};

// builds the reporting summary: counts per event + issues needing review
const buildSummary = (events) => {
    const paymentFailures = events.filter((e) => e.eventType === "payment_release" && e.result === "Failed").length;
    const summary = {
        workerApproved: events.filter((e) => e.eventType === "worker_approved").length,
        shiftsPublished: events.filter((e) => e.eventType === "shift_published").length,
        paymentsReleased: events.filter((e) => e.eventType === "payment_release").length,
        facilitiesSubmitted: events.filter((e) => e.eventType === "facility_submitted").length,
        issuesToReview: {
            paymentFailures
        }
    };
    return summary;
};

// validates the query params and returns them in a clean shape
const parseParams = (params = {}) => {
    const eventType = readEnumFilter(params.eventType, "eventType", EVENT_TYPES, "all");
    const sort = readEnumFilter(params.sort, "sort", SORT_ORDERS, "newest");
    const dateFrom = readDate(params.dateFrom, "dateFrom");
    const dateTo = readDate(params.dateTo, "dateTo");
    const page = readInteger(params.page, "page", 1, 100000);
    const limit = readInteger(params.limit, "limit", 20, 50);

    if (dateFrom && dateTo && dateFrom > dateTo) {
        throw Object.assign(new Error("dateFrom cannot be after dateTo"), { statusCode: 400 });
    }

    return { eventType, sort, dateFrom, dateTo, page, limit };
};

// main entry: returns the paginated activity feed + reporting summary
const searchActivity = async (params = {}) => {
    const options = parseParams(params);
    const allEvents = await fetchAllEvents();
    const filtered = applyFilters(allEvents, options);

    const total = filtered.length;
    const start = (options.page - 1) * options.limit;
    const data = filtered.slice(start, start + options.limit);

    return {
        data,
        counts: {
            all: allEvents.length,
            worker_approved: allEvents.filter((e) => e.eventType === "worker_approved").length,
            shift_published: allEvents.filter((e) => e.eventType === "shift_published").length,
            payment_release: allEvents.filter((e) => e.eventType === "payment_release").length,
            facility_submitted: allEvents.filter((e) => e.eventType === "facility_submitted").length
        },
        summary: buildSummary(filtered),
        filters: { eventType: options.eventType, sort: options.sort, dateFrom: options.dateFrom, dateTo: options.dateTo },
        pagination: { page: options.page, limit: options.limit, total, totalPages: Math.ceil(total / options.limit) || 0 }
    };
};

// returns ALL filtered events (no pagination) as CSV rows for export
const exportActivity = async (params = {}) => {
    const options = parseParams(params);
    const allEvents = await fetchAllEvents();
    const filtered = applyFilters(allEvents, options);

    const header = ["Time", "Event", "Account / Actor", "Result", "Reference"];
    const rows = filtered.map((e) => [
        new Date(e.time).toISOString(),
        e.eventType,
        e.accountName || e.actor,
        e.result,
        e.reference
    ]);

    return { header, rows, total: filtered.length };
};

export {
    parseParams,
    toEvents,
    applyFilters,
    buildSummary,
    paymentResult,
    inDateRange,
    readDate,
    readEnumFilter,
    readInteger,
    searchActivity,
    exportActivity,
    EVENT_TYPES,
    SORT_ORDERS
};

export default { searchActivity, exportActivity };
