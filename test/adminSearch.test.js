import assert from "node:assert/strict";
import test from "node:test";
import {
    buildWorkerSearchPipeline,
    buildFacilitySearchPipeline
} from "../services/adminSearch.js";

// ---------------- Workers ----------------

test("worker search defaults to paginated results and joins the user", () => {
    const result = buildWorkerSearchPipeline({});

    assert.deepEqual(result.pipeline[0], { $match: {} });
    assert.deepEqual(result.pipeline[1], {
        $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user"
        }
    });
    assert.equal(result.pipeline[2].$unwind, "$user");
    assert.equal(result.pipeline.length, 3);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 20);
});

test("worker search filters by profession, specialty, state and experience range", () => {
    const result = buildWorkerSearchPipeline({
        profession: "Registered Nurse",
        specialty: "Acute Care",
        state: "Lagos",
        minExperience: "2",
        maxExperience: "10",
        page: "2",
        limit: "10"
    });

    assert.deepEqual(result.pipeline[0].$match, {
        profession: "Registered Nurse",
        specialty: "Acute Care",
        "location.state": "Lagos",
        yearsOfExperience: { $gte: 2, $lte: 10 }
    });
    assert.equal(result.page, 2);
    assert.equal(result.limit, 10);
});

test("worker search filters by a single document's verification status", () => {
    const result = buildWorkerSearchPipeline({
        documentType: "professionalLicense",
        verificationStatus: "pending"
    });

    assert.deepEqual(result.pipeline[0].$match, {
        "certifications.professionalLicense.verificationStatus": "pending"
    });
});

test("worker search matches any document when no documentType is supplied", () => {
    const result = buildWorkerSearchPipeline({ verificationStatus: "rejected" });

    assert.deepEqual(result.pipeline[0].$match, {
        $or: [
            { "certifications.professionalLicense.verificationStatus": "rejected" },
            { "certifications.idDocument.verificationStatus": "rejected" },
            { "certifications.educationCert.verificationStatus": "rejected" },
            { "proofOfLocation.verificationStatus": "rejected" }
        ]
    });
});

test("worker search runs free-text and isVerified filters after the user lookup", () => {
    const result = buildWorkerSearchPipeline({ q: "RN.*", isVerified: "true" });

    const postLookup = result.pipeline[3].$match;
    assert.deepEqual(
        postLookup.$or.map((condition) => Object.keys(condition)[0]),
        ["fullName", "profession", "specialty", "user.email"]
    );
    assert.equal(postLookup.$or[0].fullName.source, "RN\\.\\*");
    assert.equal(postLookup["user.isVerified"], true);
});

test("worker search rejects invalid filters", () => {
    assert.throws(() => buildWorkerSearchPipeline({ profession: "" }), /profession must be a non-empty string/);
    assert.throws(() => buildWorkerSearchPipeline({ minExperience: "-1" }), /minExperience must be a non-negative number/);
    assert.throws(() => buildWorkerSearchPipeline({ minExperience: "10", maxExperience: "2" }), /minExperience cannot be greater than/);
    assert.throws(() => buildWorkerSearchPipeline({ verificationStatus: "approved" }), /verificationStatus must be one of/);
    assert.throws(() => buildWorkerSearchPipeline({ documentType: "passport" }), /documentType must be one of/);
    assert.throws(() => buildWorkerSearchPipeline({ documentType: "idDocument" }), /verificationStatus is required when filtering by documentType/);
    assert.throws(() => buildWorkerSearchPipeline({ isVerified: "yes" }), /isVerified must be/);
    assert.throws(() => buildWorkerSearchPipeline({ limit: "51" }), /from 1 to 50/);
    assert.throws(() => buildWorkerSearchPipeline({ page: "3000", limit: "50" }), /offset of 100000/);
});

// ---------------- Facilities ----------------

test("facility search defaults to paginated results and joins the user", () => {
    const result = buildFacilitySearchPipeline({});

    assert.deepEqual(result.pipeline[0], { $match: {} });
    assert.deepEqual(result.pipeline[1], {
        $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user"
        }
    });
    assert.equal(result.pipeline[2].$unwind, "$user");
    assert.equal(result.page, 1);
    assert.equal(result.limit, 20);
});

test("facility search filters by type, city, state and document verification", () => {
    const result = buildFacilitySearchPipeline({
        facilityType: "Hospital",
        city: "Ikeja",
        state: "Lagos",
        documentType: "facilityLicense",
        verificationStatus: "verified"
    });

    assert.deepEqual(result.pipeline[0].$match, {
        facilityType: "Hospital",
        "location.city": "Ikeja",
        "location.state": "Lagos",
        "facilityLicense.verificationStatus": "verified"
    });
});

test("facility search matches any document when no documentType is supplied", () => {
    const result = buildFacilitySearchPipeline({ verificationStatus: "pending" });

    assert.deepEqual(result.pipeline[0].$match, {
        $or: [
            { "businessRegCert.verificationStatus": "pending" },
            { "facilityLicense.verificationStatus": "pending" },
            { "taxID.verificationStatus": "pending" }
        ]
    });
});

test("facility search runs free-text and isVerified filters after the user lookup", () => {
    const result = buildFacilitySearchPipeline({ q: "St.*", isVerified: "false" });

    const postLookup = result.pipeline[3].$match;
    assert.deepEqual(
        postLookup.$or.map((condition) => Object.keys(condition)[0]),
        ["facilityName", "facilityType", "location.city", "user.email"]
    );
    assert.equal(postLookup.$or[0].facilityName.source, "St\\.\\*");
    assert.equal(postLookup["user.isVerified"], false);
});

test("facility search rejects invalid filters", () => {
    assert.throws(() => buildFacilitySearchPipeline({ facilityType: "" }), /facilityType must be a non-empty string/);
    assert.throws(() => buildFacilitySearchPipeline({ documentType: "professionalLicense" }), /documentType must be one of/);
    assert.throws(() => buildFacilitySearchPipeline({ verificationStatus: "pending", documentType: "taxID", isVerified: "maybe" }), /isVerified must be/);
    assert.throws(() => buildFacilitySearchPipeline({ limit: "0" }), /from 1 to 50/);
});

