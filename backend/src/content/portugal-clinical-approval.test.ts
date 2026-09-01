import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertPortugalClinicalApproval,
  portugalDoctorFactSha256,
  readPortugalDoctorFactRecord,
  readPortugalClinicalReviewRecord,
} from "./portugal-clinical-approval.js";
import {
  loadPortugalSeoMetadataDrafts,
  portugalSeoApprovalSha256,
} from "./portugal-seo-metadata-drafts.js";

const columns = [
  "page_or_file", "topic", "risk_level", "claims_requiring_review", "source_status",
  "reviewer_required", "publish_status", "notes", "reviewer_name", "reviewer_doctor_id",
  "clinical_reviewer_professional_body", "clinical_reviewer_specialty_id", "reviewed_at",
  "official_source_references", "approved_sha256", "compliance_reviewer_name",
  "compliance_reviewer_id", "compliance_reviewed_at", "content_owner_name", "content_owner_id",
  "content_owner_reviewed_at", "fact_register_sha256", "credential_subject_doctor_id",
  "delegated_by_doctor_id",
] as const;

function register(values: Partial<Record<(typeof columns)[number], string>>): string {
  return `${columns.join(",")}\n${columns.map((column) => values[column] ?? "").join(",")}\n`;
}

function approval(asset: string, hash: string) {
  return {
    page_or_file: asset,
    topic: "service",
    risk_level: "medium",
    claims_requiring_review: "claims",
    source_status: "evidence",
    reviewer_required: "Portugal-registered clinician",
    publish_status: "approved",
    notes: "reviewed",
    reviewer_name: "Dra. Revisora",
    reviewer_doctor_id: "doctor-pt-1",
    clinical_reviewer_professional_body: "OM",
    reviewed_at: "2026-09-01T12:00:00Z",
    official_source_references: "https://www.dgs.pt",
    approved_sha256: hash,
  } as const;
}

const now = new Date("2026-09-02T00:00:00.000Z");

test("Portugal clinical approval rejects blocked, incomplete and unofficial reviews", () => {
  const hash = "a".repeat(64);
  assert.throws(
    () => assertPortugalClinicalApproval(register({
      ...approval("/portugal/pt", hash),
      publish_status: "blocked_pending_review",
    }), { asset: "/portugal/pt", approvedSha256: hash, now }),
    /status is blocked_pending_review/,
  );
  assert.throws(
    () => assertPortugalClinicalApproval(register({
      ...approval("/portugal/pt", hash),
      reviewer_name: "",
    }), { asset: "/portugal/pt", approvedSha256: hash, now }),
    /reviewer_name is blank/,
  );
  assert.throws(
    () => assertPortugalClinicalApproval(register({
      ...approval("/portugal/pt", hash),
      official_source_references: "https://example.com",
    }), { asset: "/portugal/pt", approvedSha256: hash, now }),
    /non-official Portugal source/,
  );
  assert.throws(
    () => assertPortugalClinicalApproval(register({
      ...approval("/portugal/pt", hash),
      reviewed_at: "2026-02-30T12:00:00Z",
    }), { asset: "/portugal/pt", approvedSha256: hash, now }),
    /invalid/,
  );
  const extraColumn = register(approval("/portugal/pt", hash)).replace(/\n$/, ",unexpected\n");
  assert.throws(
    () => assertPortugalClinicalApproval(extraColumn, { asset: "/portugal/pt", approvedSha256: hash, now }),
    /unexpected columns/,
  );
});

test("Portugal clinical approval accepts the Czech-parity clinician contract", () => {
  const hash = "b".repeat(64);
  const csv = register(approval("/portugal/pt", hash));
  const row = assertPortugalClinicalApproval(csv, { asset: "/portugal/pt", approvedSha256: hash, now });
  assert.equal(row.reviewer_name, "Dra. Revisora");
  assert.equal(readPortugalClinicalReviewRecord(csv, "/portugal/pt").publish_status, "approved");
});

test("Portugal doctor metadata uses the same approval without changing credentials", () => {
  const asset = "/portugal/pt/doctors/dr-martim-delgado";
  const hash = "c".repeat(64);
  const facts = [
    "URL,slug,display_name,professional_body,registration_number,source_status,official_source,verification_status,notes",
    '"https://www.myglobalhealth.online/portugal/pt/doctors/dr-martim-delgado","dr-martim-delgado","Dr. Martim Delgado","OM","70349","Official","https://ordemdosmedicos.pt/registo/70349","verified","Metadata only"',
  ].join("\n");
  const factHash = portugalDoctorFactSha256(readPortugalDoctorFactRecord(facts, asset));
  const clinical = register({
    ...approval(asset, hash),
    official_source_references: "https://ordemdosmedicos.pt/registo/70349",
    fact_register_sha256: factHash,
    credential_subject_doctor_id: "doctor-subject-1",
  });

  assert.doesNotThrow(() => assertPortugalClinicalApproval(clinical, {
    asset,
    approvedSha256: hash,
    factRegisterCsv: facts,
    now,
  }));
  assert.throws(() => assertPortugalClinicalApproval(clinical, {
    asset,
    approvedSha256: hash,
    factRegisterCsv: facts.replace("70349", "99999"),
    now,
  }), /fact_register_sha256|canonical/i);
});

test("the Portugal register approves the exact 28 reviewed metadata drafts", () => {
  const root = process.cwd().endsWith("backend") ? resolve(process.cwd(), "..") : process.cwd();
  const csv = readFileSync(resolve(root, "seo/portugal/clinical-review-register.csv"), "utf8");
  const facts = readFileSync(resolve(root, "seo/portugal/doctor-profile-fact-register.csv"), "utf8");
  const drafts = loadPortugalSeoMetadataDrafts();

  assert.equal(drafts.length, 28);
  for (const draft of drafts) {
    const row = assertPortugalClinicalApproval(csv, {
      asset: draft.asset,
      approvedSha256: portugalSeoApprovalSha256(draft),
      factRegisterCsv: facts,
      now,
    });
    assert.equal(row.reviewer_name, "Dr Tiago Miguel Figueira");
    assert.equal(row.reviewer_doctor_id, "cmp5r0if3002kssjug743x0p6");
    assert.equal(row.clinical_reviewer_professional_body, "OM");
    assert.equal(row.reviewed_at, "2026-09-01T18:30:00+02:00");
  }
});

test("the Portugal tool runtime metadata matches its approved draft", () => {
  const root = process.cwd().endsWith("backend") ? resolve(process.cwd(), "..") : process.cwd();
  const runtime = JSON.parse(readFileSync(
    resolve(root, "frontend/lib/tools/portugal-approved-tool-seo.json"),
    "utf8",
  )) as Record<string, { metaTitle: string; metaDescription: string }>;
  const draft = loadPortugalSeoMetadataDrafts().find(({ targetKind }) => targetKind === "tool");

  assert.ok(draft);
  assert.deepEqual(Object.keys(runtime), [draft.slug]);
  assert.equal(runtime[draft.slug]?.metaTitle, draft.proposedTitle);
  assert.equal(runtime[draft.slug]?.metaDescription, draft.proposedDescription);
});
