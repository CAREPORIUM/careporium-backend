import assert from "node:assert/strict";
import test from "node:test";
import {
    parseParams,
    toEvents,
    applyFilters,
    buildSummary,
    paymentResult,
    readDate
} from "../services/activityReportSearch.js";

// ---------- parseParams validation ----------

test("parseParams returns sensible defaults", () => {
    const params = parseParams({});
    assert.deepEqual(params, {
        eventType: "all",
        sort: "newest",
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
        limit: 20
    });
});

test("parseParams accepts valid values", () => {
    const params = parseParams({ eventType: "payment_release", sort: "oldest", page: "2", limit: "50" });
    assert.equal(params.eventType, "payment_release");
    assert.equal(params.sort, "oldest");
    assert.equal(params.page, 2);
    assert.equal(params.limit, 50);
});

test("parseParams rejects invalid event type", () => {
    assert.throws(() => parseParams({ eventType: "payout" }), /eventType must be one of/);
});

test("parseParams rejects invalid sort", () => {
    assert.throws(() => parseParams({ sort: "random" }), /sort must be one of/);
});

test("parseParams rejects bad date format", () => {
    assert.throws(() => parseParams({ dateFrom: "06/10/2026" }), /dateFrom must use YYYY-MM-DD/);
    assert.throws(() => parseParams({ dateTo: "2026-13-40" }), /dateTo must be a valid calendar date/);
});

test("parseParams rejects a reversed date range", () => {
    assert.throws(() => parseParams({ dateFrom: "2026-10-10", dateTo: "2026-10-01" }), /dateFrom cannot be after dateTo/);
});

test("parseParams caps limit at 50 and rejects out-of-range paging", () => {
    assert.throws(() => parseParams({ limit: "100" }), /limit must be an integer from 1 to 50/);
    assert.throws(() => parseParams({ page: "0" }), /page must be an integer from 1/);
});

// ---------- readDate ----------

test("readDate accepts a real calendar date and rejects impossible ones", () => {
    assert.equal(readDate("2026-10-06", "dateFrom"), "2026-10-06");
    assert.throws(() => readDate("2026-02-30", "dateFrom"), /valid calendar date/);
});

// ---------- paymentResult mapping ----------


// ---------- toEvents ----------

const sample = {
    workers: [
        { _id: "abcdef1234", fullName: "Amara Okafor", verificationStatus: "verified", verifiedAt: "2026-10-02T08:20:00Z", createdAt: "2026-09-20T08:00:00Z" },
        { _id: "bbbbbbbbbb", fullName: "Pending Nurse", verificationStatus: "pending", verifiedAt: null, createdAt: "2026-09-21T08:00:00Z" }
    ],
    facilities: [
        { _id: "fac111", facilityName: "Mainland Care Hospital", createdAt: "2026-10-01T09:00:00Z" },
        { _id: "fac222", facilityName: "Yaba Clinic", createdAt: "2026-10-01T10:00:00Z" }
    ],
    shifts: [
        { _id: "shift9999", facility: { facilityName: "Mainland Care Hospital" }, isUrgent: true, createdAt: "2026-10-01T11:00:00Z" }
    ],
    applications: [
        {
            status: "accepted",
            updatedAt: "2026-10-02T09:00:00Z",
            worker: { fullName: "Assigned Nurse" },
            shift: { _id: "shift5555", facility: { facilityName: "Mainland Care Hospital" } }
        }
    ],
    payments: [
        { _id: "pay111", facility: { facilityName: "Yaba Clinic" }, fundingStatus: "funded", payoutStatus: "paid", paidAt: "2026-10-01T15:00:00Z" }
    ]
};

test("toEvents builds a unified feed from all sources", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    // 1 verified worker + 1 assignment + 1 shift + 1 payment + 2 facilities = 6
    assert.equal(events.length, 6);

    const types = events.map((e) => e.eventType).sort();
    assert.deepEqual(types, ["facility_submitted", "facility_submitted", "payment_release", "shift_published", "worker_approved", "worker_approved"]);
});

test("toEvents excludes non-verified workers and non-accepted applications", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    assert.ok(!events.some((e) => e.accountName === "Pending Nurse"));
    assert.equal(events.filter((e) => e.eventType === "worker_approved").length, 2);
});

test("toEvents labels an urgent shift as Urgent", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const shiftEvent = events.find((e) => e.eventType === "shift_published");
    assert.equal(shiftEvent.result, "Urgent");
    assert.equal(shiftEvent.accountName, "Mainland Care Hospital");
});

test("toEvents builds a readable reference for each event type", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const worker = events.find((e) => e.eventType === "worker_approved" && e.subtype === "verified");
    assert.equal(worker.reference, "WK-1234"); // last 4 chars of the id
    const payment = events.find((e) => e.eventType === "payment_release");
    assert.equal(payment.reference, "PY-y111"); // last 4 chars of the id "pay111"
    const facility = events.find((e) => e.eventType === "facility_submitted");
    assert.ok(facility.reference.startsWith("FC-"));
});

// ---------- applyFilters ----------

test("applyFilters filters by event type", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const only = applyFilters(events, { eventType: "payment_release", sort: "newest" });
    assert.equal(only.length, 1);
    assert.equal(only[0].eventType, "payment_release");
});

test("applyFilters sorts newest first by default", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const newest = applyFilters(events, { eventType: "all", sort: "newest" });
    assert.ok(new Date(newest[0].time) >= new Date(newest[newest.length - 1].time));
});

test("applyFilters sorts oldest first when requested", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const oldest = applyFilters(events, { eventType: "all", sort: "oldest" });
    assert.ok(new Date(oldest[0].time) <= new Date(oldest[oldest.length - 1].time));
});

test("applyFilters restricts by date range", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const ranged = applyFilters(events, { eventType: "all", dateFrom: "2026-10-02", dateTo: "2026-10-02" });
    assert.ok(ranged.every((e) => new Date(e.time).toISOString().slice(0, 10) === "2026-10-02"));
});

// ---------- buildSummary ----------

test("buildSummary counts events and flags payment failures", () => {
    const events = toEvents(sample.workers, sample.facilities, sample.shifts, sample.applications, sample.payments);
    const summary = buildSummary(events);
    assert.equal(summary.workerApproved, 2);
    assert.equal(summary.shiftsPublished, 1);
    assert.equal(summary.paymentsReleased, 1);
    assert.equal(summary.facilitiesSubmitted, 2);
    assert.equal(summary.issuesToReview.paymentFailures, 0);
});

test("buildSummary counts a failed payment as an issue to review", () => {
    const failedPayments = [{ _id: "p2", facility: { facilityName: "X" }, fundingStatus: "failed", payoutStatus: "not_ready", createdAt: "2026-10-01T12:00:00Z" }];
    const events = toEvents([], [], [], [], failedPayments);
    const summary = buildSummary(events);
    assert.equal(summary.paymentsReleased, 1);
    assert.equal(summary.issuesToReview.paymentFailures, 1);
});

test("paymentResult maps payout/funding status to a feed result", () => {
    assert.deepEqual(paymentResult({ payoutStatus: "paid", fundingStatus: "funded" }), { result: "Success", status: "paid" });
    assert.deepEqual(paymentResult({ payoutStatus: "failed", fundingStatus: "funded" }), { result: "Failed", status: "failed" });
    assert.deepEqual(paymentResult({ payoutStatus: "not_ready", fundingStatus: "failed" }), { result: "Failed", status: "failed" });
    assert.deepEqual(paymentResult({ payoutStatus: "on_hold", fundingStatus: "funded" }), { result: "On hold", status: "on_hold" });
    assert.deepEqual(paymentResult({ payoutStatus: "pending", fundingStatus: "funded" }), { result: "Pending", status: "pending" });
});
