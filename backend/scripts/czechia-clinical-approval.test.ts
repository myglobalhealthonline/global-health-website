import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCzechiaClinicalApproval,
  readCzechiaClinicalReviewRecord,
} from "./lib/czechia-clinical-approval.js";

const HEADER = [
  "asset",
  "asset_type",
  "review_domain",
  "reason",
  "claim_guardrail",
  "official_source",
  "priority",
  "reviewer_requirement",
  "status",
  "reviewer_name",
  "reviewer_doctor_id",
  "reviewed_at",
  "approved_sha256",
  "native_reviewer_name",
  "native_reviewer_id",
  "native_reviewed_at",
].join(",");

const HASH = "a".repeat(64);
const NOW = new Date("2026-09-01T12:00:00.000Z");

function row(overrides: Record<string, string> = {}): string {
  const values: Record<string, string> = {
    asset: "/czechia/cs/services/neschopenka-online",
    asset_type: "service page",
    review_domain: "eNeschopenka",
    reason: "scope",
    claim_guardrail: "No guarantees",
    official_source: "https://example.test/source",
    priority: "P0",
    reviewer_requirement: "Czech-licensed physician",
    status: "approved",
    reviewer_name: "MUDr. Reviewer",
    reviewer_doctor_id: "CLK-12345",
    reviewed_at: "2026-09-01T10:00:00.000Z",
    approved_sha256: HASH,
    native_reviewer_name: "",
    native_reviewer_id: "",
    native_reviewed_at: "",
    ...overrides,
  };

  return Object.keys(values).map((key) => values[key]).join(",");
}

function csv(overrides: Record<string, string> = {}): string {
  return `${HEADER}\n${row(overrides)}\n`;
}

test("returns the exact clinical-review row for an asset", () => {
  const record = readCzechiaClinicalReviewRecord(
    `${HEADER}\n${row({ asset: "/czechia/cs/other" })}\n${row()}\n`,
    "/czechia/cs/services/neschopenka-online",
  );

  assert.equal(record.asset, "/czechia/cs/services/neschopenka-online");
  assert.equal(record.reviewer_name, "MUDr. Reviewer");
  assert.throws(
    () => readCzechiaClinicalReviewRecord(csv(), "/czechia/cs/missing"),
    /missing/i,
  );
});

test("accepts a fully recorded Czech clinical approval", () => {
  const record = assertCzechiaClinicalApproval(csv(), {
    asset: "/czechia/cs/services/neschopenka-online",
    approvedSha256: HASH,
    now: NOW,
  });

  assert.equal(record.status, "approved");
});

test("rejects pending, blank, future, malformed, and mismatched approvals", () => {
  const options = {
    asset: "/czechia/cs/services/neschopenka-online",
    approvedSha256: HASH,
    now: NOW,
  };

  assert.throws(() => assertCzechiaClinicalApproval(csv({ status: "pending" }), options), /pending/i);
  assert.throws(() => assertCzechiaClinicalApproval(csv({ reviewer_name: "" }), options), /reviewer_name/i);
  assert.throws(() => assertCzechiaClinicalApproval(csv({ reviewer_doctor_id: "" }), options), /reviewer_doctor_id/i);
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({ reviewed_at: "2026-09-01T13:00:00.000Z" }), options),
    /future/i,
  );
  assert.throws(() => assertCzechiaClinicalApproval(csv({ reviewed_at: "yesterday" }), options), /reviewed_at/i);
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({ reviewed_at: "2026-02-30T10:00:00.000Z" }), options),
    /reviewed_at/i,
  );
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({ approved_sha256: "b".repeat(64) }), options),
    /approved_sha256/i,
  );
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({ approved_sha256: "not-a-hash" }), options),
    /approved_sha256/i,
  );
});

test("requires a recorded native review for English assets", () => {
  const asset = "/czechia/en/services/lekar-online-praha";
  const options = { asset, approvedSha256: HASH, now: NOW };
  const english = { asset };

  assert.throws(() => assertCzechiaClinicalApproval(csv(english), options), /native_reviewer_name/i);
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({ ...english, native_reviewer_name: "Native Editor" }), options),
    /native_reviewer_id/i,
  );
  assert.throws(
    () => assertCzechiaClinicalApproval(csv({
      ...english,
      native_reviewer_name: "Native Editor",
      native_reviewer_id: "EDITOR-9",
      native_reviewed_at: "2026-09-01T13:00:00.000Z",
    }), options),
    /future/i,
  );

  assert.equal(assertCzechiaClinicalApproval(csv({
    ...english,
    native_reviewer_name: "Native Editor",
    native_reviewer_id: "EDITOR-9",
    native_reviewed_at: "2026-09-01T11:00:00.000Z",
  }), options).asset, asset);
});
