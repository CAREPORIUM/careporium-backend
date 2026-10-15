import assert from "node:assert/strict";
import test from "node:test";
import { buildVerificationQueue } from "../services/verificationQueueSearch.js";

// helper to build a worker with a chosen set of pending documents
const makeWorker = (id, fullName, profession, createdAt, pending = {}) => ({
    _id: id,
    fullName,
    profession,
    createdAt,
    certifications: {
        professionalLicense: pending.professionalLicense ? { url: "x", verificationStatus: "pending" } : {},
        idDocument: pending.idDocument ? { url: "x", verificationStatus: "pending" } : {},
        educationCert: pending.educationCert ? { url: "x", verificationStatus: "pending" } : {}
    },
    proofOfLocation: pending.proofOfLocation ? { url: "x", verificationStatus: "pending" } : {}
});

// helper to build a facility with a chosen set of pending documents
const makeFacility = (id, facilityName, createdAt, pending = {}) => ({
    _id: id,
    facilityName,
    facilityType: "Hospital",
    createdAt,
    businessRegCert: pending.businessRegCert ? { url: "x", verificationStatus: "pending" } : {},
    facilityLicense: pending.facilityLicense ? { url: "x", verificationStatus: "pending" } : {},
    taxID: pending.taxID ? { url: "x", verificationStatus: "pending" } : {}
});

const workers = [
    makeWorker("w1", "Amara Okafor", "Registered Nurse", "2026-10-02T08:20:00Z", { idDocument: true }),
    makeWorker("w2", "Chidinma Eze", "Registered Nurse", "2026-10-01T10:15:00Z", { professionalLicense: true, proofOfLocation: true }),
    makeWorker("w3", "Tunde Bello", "Pharmacist", "2026-09-30T09:00:00Z", {}) // fully verified -> excluded
];

const facilities = [
    makeFacility("f1", "Mainland Care Hospital", "2026-10-01T16:40:00Z", { facilityLicense: true }),
    makeFacility("f2", "Yaba Clinic", "2026-09-29T12:00:00Z", {}) // fully verified -> excluded
];

test("returns one row per applicant that has pending documents", () => {
    const result = buildVerificationQueue(workers, facilities, {});

    // 3 applicants excluded (fully verified), leaving 3 with pending docs
    assert.equal(result.counts.all, 3);
    assert.equal(result.counts.workers, 2);
    assert.equal(result.counts.facilities, 1);
    assert.equal(result.data.length, 3);
    assert.ok(result.data.every((row) => row.status === "pending"));
});

test("defaults to newest first", () => {
    const result = buildVerificationQueue(workers, facilities, {});
    assert.equal(result.filters.sort, "newest");
    // newest submission (2 Oct) should come first
    assert.equal(result.data[0].name, "Amara Okafor");
});

test("sorts oldest first when requested", () => {
    const result = buildVerificationQueue(workers, facilities, { sort: "oldest" });
    assert.equal(result.filters.sort, "oldest");
    // Chidinma Eze (1 Oct 10:15) is the oldest pending submission
    assert.equal(result.data[0].name, "Chidinma Eze");
    assert.equal(result.data[result.data.length - 1].name, "Amara Okafor");
});

test("filters by workers and facilities", () => {
    const onlyWorkers = buildVerificationQueue(workers, facilities, { type: "workers" });
    assert.equal(onlyWorkers.data.length, 2);
    assert.ok(onlyWorkers.data.every((row) => row.type === "worker"));

    const onlyFacilities = buildVerificationQueue(workers, facilities, { type: "facilities" });
    assert.equal(onlyFacilities.data.length, 1);
    assert.equal(onlyFacilities.data[0].name, "Mainland Care Hospital");
});

test("searches by name, facility and submission ID", () => {
    const byName = buildVerificationQueue(workers, facilities, { q: "amara" });
    assert.equal(byName.data.length, 1);
    assert.equal(byName.data[0].name, "Amara Okafor");

    const byFacility = buildVerificationQueue(workers, facilities, { q: "mainland" });
    assert.equal(byFacility.data.length, 1);
    assert.equal(byFacility.data[0].name, "Mainland Care Hospital");

    const byId = buildVerificationQueue(workers, facilities, { q: "w2" });
    assert.equal(byId.data.length, 1);
    assert.equal(byId.data[0].name, "Chidinma Eze");
});

test("counts update with the active search", () => {
    const result = buildVerificationQueue(workers, facilities, { q: "amara" });
    assert.deepEqual(result.counts, { all: 1, workers: 1, facilities: 0 });
});

test("escapes regex special characters in the search term", () => {
    // should match nothing rather than throw or over-match
    const result = buildVerificationQueue(workers, facilities, { q: ".*" });
    assert.equal(result.data.length, 0);
});

test("rejects invalid filters", () => {
    assert.throws(() => buildVerificationQueue(workers, facilities, { type: "admins" }), /type must be one of/);
    assert.throws(() => buildVerificationQueue(workers, facilities, { sort: "random" }), /sort must be one of/);
    assert.throws(() => buildVerificationQueue(workers, facilities, { q: "" }), /q must be a non-empty string/);
});
