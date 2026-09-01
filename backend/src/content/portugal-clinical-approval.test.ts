import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPortugalClinicalApproval,
  portugalDoctorFactSha256,
  readPortugalClinicalReviewRecord,
  readPortugalDoctorFactRecord,
} from "./portugal-clinical-approval.js";

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
    reviewer_required: "clinician + compliance + content owner",
    publish_status: "approved",
    notes: "reviewed",
    reviewer_name: "Dra. Revisora",
    reviewer_doctor_id: "doctor-pt-1",
    clinical_reviewer_professional_body: "OM",
    clinical_reviewer_specialty_id: "specialty-pt-1",
    reviewed_at: "2026-09-01T12:00:00Z",
    official_source_references: "https://www.dgs.pt",
    approved_sha256: hash,
    compliance_reviewer_name: "Pessoa Compliance",
    compliance_reviewer_id: "compliance-1",
    compliance_reviewed_at: "2026-09-01T13:00:00Z",
    content_owner_name: "Pessoa Conteúdo",
    content_owner_id: "content-owner-1",
    content_owner_reviewed_at: "2026-09-01T14:00:00Z",
  } as const;
}

const now = new Date("2026-09-02T00:00:00.000Z");

test("Portugal clinical approval rejects blocked, incomplete and unofficial reviews", () => {
  const hash = "a".repeat(64);
  assert.throws(
    () => assertPortugalClinicalApproval(register({ ...approval("/portugal/pt", hash), publish_status: "blocked_pending_review" }), {
      asset: "/portugal/pt", approvedSha256: hash, now,
    }),
    /status is blocked_pending_review/,
  );
  assert.throws(
    () => assertPortugalClinicalApproval(register({ ...approval("/portugal/pt", hash), compliance_reviewer_name: "" }), {
      asset: "/portugal/pt", approvedSha256: hash, now,
    }),
    /compliance_reviewer_name is blank/,
  );
  assert.throws(
    () => assertPortugalClinicalApproval(register({ ...approval("/portugal/pt", hash), official_source_references: "https://example.com" }), {
      asset: "/portugal/pt", approvedSha256: hash, now,
    }),
    /non-official Portugal source/,
  );
});

test("Portugal clinical approval accepts distinct, dated, official-source-bound roles", () => {
  const hash = "b".repeat(64);
  const csv = register(approval("/portugal/pt", hash));
  const row = assertPortugalClinicalApproval(csv, { asset: "/portugal/pt", approvedSha256: hash, now });
  assert.equal(row.reviewer_name, "Dra. Revisora");
  assert.equal(readPortugalClinicalReviewRecord(csv, "/portugal/pt").publish_status, "approved");
});

test("Portugal doctor approval requires a verified, hash-bound official fact record", () => {
  const asset = "/portugal/pt/doctors/dr-martim-delgado";
  const hash = "c".repeat(64);
  const factHeader = "URL,slug,display_name,professional_body,registration_number,source_status,official_source,verification_status,notes";
  const verifiedFacts = `${factHeader}\nhttps://www.myglobalhealth.online${asset},dr-martim-delgado,Dr. Martim Delgado,OM,70349,Official register checked,https://ordemdosmedicos.pt/registo/70349,verified,Checked\n`;
  const factHash = portugalDoctorFactSha256(readPortugalDoctorFactRecord(verifiedFacts, asset));
  const clinical = register({
    ...approval(asset, hash),
    official_source_references: "https://ordemdosmedicos.pt/registo/70349",
    fact_register_sha256: factHash,
    credential_subject_doctor_id: "doctor-subject-1",
    delegated_by_doctor_id: "doctor-subject-1",
  });

  assert.doesNotThrow(() => assertPortugalClinicalApproval(clinical, {
    asset, approvedSha256: hash, factRegisterCsv: verifiedFacts, now,
  }));
  assert.throws(() => assertPortugalClinicalApproval(clinical, {
    asset,
    approvedSha256: hash,
    factRegisterCsv: verifiedFacts.replace(",verified,", ",pending_official_verification,"),
    now,
  }), /fact verification status is pending_official_verification/);
  assert.throws(
    () => readPortugalDoctorFactRecord(verifiedFacts.replace("www.myglobalhealth.online", "example.com"), asset),
    /canonical Global Health profile/,
  );
});
