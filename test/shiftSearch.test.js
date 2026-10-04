import assert from "node:assert/strict";
import test from "node:test";
import { buildShiftSearchPipeline } from "../services/shiftSearch.js";

const now = new Date("2026-10-04T12:00:00.000Z");

test("defaults to open upcoming shifts and bounded pagination", () => {
    const result = buildShiftSearchPipeline({}, now);

    assert.deepEqual(result.pipeline[0], {
        $match: { status: "open", date: { $gte: now } },
    });
    assert.equal(result.page, 1);
    assert.equal(result.limit, 20);
});

test("maps profession to role and filters dates, specialty, shift type, location, and pay", () => {
    const result = buildShiftSearchPipeline({
        profession: "Registered Nurse",
        specialty: "Acute Care",
        dateFrom: "2026-10-06",
        dateTo: "2026-10-08",
        shiftType: "Day shift",
        city: "Lagos",
        state: "Lagos",
        minPay: "3000",
        page: "2",
        limit: "10",
    }, now);

    assert.deepEqual(result.pipeline[0].$match, {
        status: "open",
        role: "Registered Nurse",
        specialty: "Acute Care",
        shiftType: "Day shift",
        "location.city": "Lagos",
        "location.state": "Lagos",
        payRate: { $gte: 3000 },
        date: {
        $gte: new Date("2026-10-06T00:00:00.000Z"),
        $lt: new Date("2026-10-09T00:00:00.000Z"),
        },
    });
    assert.equal(result.page, 2);
    assert.equal(result.limit, 10);
});

test("looks up facility and escapes free-text search across role, specialty, and facility name", () => {
    const result = buildShiftSearchPipeline({ q: "RN.*" }, now);

    assert.deepEqual(result.pipeline[1], {
        $lookup: {
            from: "facilities",
            localField: "facility",
            foreignField: "_id",
            as: "facility",
        },
    });
    assert.deepEqual(result.pipeline[3].$match.$or.map((condition) => Object.keys(condition)[0]), [
        "role",
        "specialty",
        "facility.facilityName",
    ]);
    assert.equal(result.pipeline[3].$match.$or[0].role.source, "RN\\.\\*");
});

test("rejects invalid dates, reversed date ranges, invalid pay, and excessive limits", () => {
    assert.throws(() => buildShiftSearchPipeline({ dateFrom: "2026-02-30" }, now), /valid calendar date/);
    assert.throws(() => buildShiftSearchPipeline({ dateFrom: "2026-10-09", dateTo: "2026-10-08" }, now), /cannot be after/);
    assert.throws(() => buildShiftSearchPipeline({ minPay: "-1" }, now), /non-negative number/);
    assert.throws(() => buildShiftSearchPipeline({ minPay: "" }, now), /non-negative number/);
    assert.throws(() => buildShiftSearchPipeline({ minPay: ["3000"] }, now), /non-negative number/);
    assert.throws(() => buildShiftSearchPipeline({ limit: "51" }, now), /from 1 to 50/);
    assert.throws(() => buildShiftSearchPipeline({ page: "3000", limit: "50" }, now), /offset of 100000/);
});