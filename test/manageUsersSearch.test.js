import assert from "node:assert/strict";
import test from "node:test";
import {
    buildManageUsers,
    matchesTab,
    toWorkerRow,
    toFacilityRow,
    buildAccountId
} from "../services/manageUsersSearch.js";

// helper to build a worker row input (mirrors a lean Worker doc)
const worker = (id, fullName, verificationStatus, access, createdAt) => ({
    _id: id,
    fullName,
    verificationStatus,
    verifiedAt: verificationStatus === "verified" ? createdAt : null,
    createdAt,
    user: { email: `${fullName.split(" ")[0].toLowerCase()}@example.com`, accessStatus: access }
});

// helper to build a facility row input (mirrors a lean Facility doc)
const facility = (id, facilityName, verificationStatus, access, createdAt) => ({
    _id: id,
    facilityName,
    verificationStatus,
    verifiedAt: null,
    createdAt,
    user: { email: `${facilityName.split(" ")[0].toLowerCase()}@example.com`, accessStatus: access }
});

const workers = [
    worker("wk1111aaaa", "Amara Okafor", "verified", "active", "2026-09-20T08:00:00Z"),
    worker("wk2222bbbb", "Chidinma Eze", "pending", "restricted", "2026-10-01T10:00:00Z"),
    worker("wk3333cccc", "Tunde Bello", "verified", "suspended", "2026-10-02T12:00:00Z")
];

const facilities = [
    facility("fc4444dddd", "Mainland Care Hospital", "verified", "active", "2026-09-25T09:00:00Z"),
    facility("fc5555eeee", "Yaba Clinic", "pending", "active", "2026-10-03T14:00:00Z")
];

// ---------- row mapping ----------

test("toWorkerRow builds a unified account row", () => {
    const row = toWorkerRow(workers[0]);
    assert.equal(row.type, "worker");
    assert.equal(row.role, "Worker");
    assert.equal(row.account, "Amara Okafor");
    assert.equal(row.verification, "Verified");
    assert.equal(row.access, "active");
    assert.equal(row.accountId, "WK-aaaa");
});

test("toFacilityRow builds a unified account row", () => {
    const row = toFacilityRow(facilities[0]);
    assert.equal(row.type, "facility");
    assert.equal(row.role, "Facility");
    assert.equal(row.account, "Mainland Care Hospital");
    assert.equal(row.accountId, "FC-dddd");
});

// ---------- combined table + counts ----------

test("combines workers and facilities with correct tab counts", () => {
    const result = buildManageUsers(workers, facilities, {});
    assert.equal(result.rows.length, 5);
    assert.deepEqual(result.counts, {
        all: 5,
        workers: 3,
        facilities: 2,
        verified: 3,
        suspended: 1
    });
});

test("defaults to newest first", () => {
    const result = buildManageUsers(workers, facilities, {});
    assert.equal(result.filters.sort, "newest");
    assert.equal(result.filters.tab, "all");
    assert.equal(result.rows[0].account, "Yaba Clinic");
});

test("sorts oldest first when requested", () => {
    const result = buildManageUsers(workers, facilities, { sort: "oldest" });
    assert.equal(result.rows[0].account, "Amara Okafor");
});

// ---------- tab filters ----------

test("tab filter shows only workers", () => {
    const result = buildManageUsers(workers, facilities, { tab: "workers" });
    assert.equal(result.rows.length, 3);
    assert.ok(result.rows.every((row) => row.type === "worker"));
});

test("tab filter shows only facilities", () => {
    const result = buildManageUsers(workers, facilities, { tab: "facilities" });
    assert.equal(result.rows.length, 2);
    assert.ok(result.rows.every((row) => row.type === "facility"));
});

test("tab filter shows only verified accounts", () => {
    const result = buildManageUsers(workers, facilities, { tab: "verified" });
    assert.equal(result.rows.length, 3);
    assert.ok(result.rows.every((row) => row.verification === "Verified"));
});

test("tab filter shows only suspended accounts", () => {
    const result = buildManageUsers(workers, facilities, { tab: "suspended" });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].account, "Tunde Bello");
    assert.equal(result.rows[0].access, "suspended");
});

// ---------- search ----------

test("search matches by name", () => {
    const result = buildManageUsers(workers, facilities, { q: "amara" });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].account, "Amara Okafor");
});

test("search matches by email", () => {
    const result = buildManageUsers(workers, facilities, { q: "mainland@example.com" });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].account, "Mainland Care Hospital");
});

test("search matches by account ID", () => {
    const result = buildManageUsers(workers, facilities, { q: "WK-bbbb" });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].account, "Chidinma Eze");
});

test("search updates the tab counts", () => {
    const result = buildManageUsers(workers, facilities, { q: "amara" });
    assert.deepEqual(result.counts, { all: 1, workers: 1, facilities: 0, verified: 1, suspended: 0 });
});

test("search escapes regex special characters", () => {
    const result = buildManageUsers(workers, facilities, { q: ".*" });
    assert.equal(result.rows.length, 0);
});

// ---------- validation ----------

test("rejects invalid tab and sort", () => {
    assert.throws(() => buildManageUsers(workers, facilities, { tab: "admins" }), /tab must be one of/);
    assert.throws(() => buildManageUsers(workers, facilities, { sort: "random" }), /sort must be one of/);
});

test("rejects empty or oversized search term", () => {
    assert.throws(() => buildManageUsers(workers, facilities, { q: "" }), /q must be a non-empty string/);
    assert.throws(() => buildManageUsers(workers, facilities, { q: "a".repeat(101) }), /100 characters or fewer/);
});

test("matchesTab returns true for all on unknown tab", () => {
    assert.equal(matchesTab({ type: "worker" }, "all"), true);
});


test("access defaults to active when the user has no accessStatus", () => {
    const row = toWorkerRow({ _id: "wk9999", fullName: "No Access", verificationStatus: "pending", createdAt: "2026-10-01T00:00:00Z", user: { email: "x@y.com" } });
    assert.equal(row.access, "active");
});

test("buildAccountId prefixes and takes the last 4 chars", () => {
    assert.equal(buildAccountId("WK", "abcdef1234"), "WK-1234");
    assert.equal(buildAccountId("FC", "facXYZ"), "FC-cXYZ");
});
