import assert from "node:assert/strict";
import test from "node:test";

import { loadPortugalSeoMetadataDrafts, portugalSeoApprovalSha256, portugalSeoConfirmationToken } from "./portugal-seo-metadata-drafts.js";
import {
  assertPortugalSeoApplyAuthorized,
  portugalDatabaseIdentity,
} from "./portugal-seo-metadata-patch.js";

const draft = loadPortugalSeoMetadataDrafts().find(
  ({ url }) => url.endsWith("/services/consulta-medica"),
)!;
const hash = portugalSeoApprovalSha256(draft);
const approvalHeader = [
  "page_or_file", "topic", "risk_level", "claims_requiring_review",
  "source_status", "reviewer_required", "publish_status", "notes",
  "reviewer_name", "reviewer_doctor_id", "clinical_reviewer_professional_body",
  "clinical_reviewer_specialty_id", "reviewed_at",
  "official_source_references", "approved_sha256",
  "compliance_reviewer_name", "compliance_reviewer_id", "compliance_reviewed_at",
  "content_owner_name", "content_owner_id", "content_owner_reviewed_at", "fact_register_sha256",
  "credential_subject_doctor_id", "delegated_by_doctor_id",
].join(",");
const approvedRegister = `${approvalHeader}\n${draft.asset},service page,medium,claims,evidence,three roles,approved,notes,Dra. Revisora,doctor-pt-1,OM,specialty-pt-1,2026-09-01T12:00:00Z,https://www.dgs.pt,${hash},Pessoa Compliance,compliance-1,2026-09-01T13:00:00Z,Pessoa Conteúdo,content-owner-1,2026-09-01T14:00:00Z,,,\n`;

const authorized = {
  apply: true,
  draft,
  registerCsv: approvedRegister,
  factRegisterCsv: "",
  approvedHash: hash,
  confirmation: portugalSeoConfirmationToken(draft),
  reviewerDoctorId: "doctor-pt-1",
  reviewedAt: "2026-09-01",
  complianceReviewerId: "compliance-1",
  complianceReviewedAt: "2026-09-01",
  contentOwnerId: "content-owner-1",
  contentOwnerReviewedAt: "2026-09-01",
  databaseUrl: "postgresql://user:secret@db.example.test/global_health",
  confirmationDatabase: "postgresql://db.example.test:5432/global_health",
  now: new Date("2026-09-02T00:00:00.000Z"),
} as const;

test("Portugal metadata apply requires the complete approval contract", () => {
  assert.doesNotThrow(() => assertPortugalSeoApplyAuthorized(authorized));
  assert.doesNotThrow(() => assertPortugalSeoApplyAuthorized({ ...authorized, apply: false }));

  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, confirmation: "wrong" }),
    /confirmation token/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, confirmationDatabase: "postgresql://db.example.test:5432/other" }),
    /database identity/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, confirmationDatabase: "postgresql://db.example.test:5433/global_health" }),
    /database identity/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, reviewerDoctorId: "other-doctor" }),
    /reviewer doctor ID/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, reviewedAt: "2026-08-31" }),
    /review date/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, complianceReviewerId: "other" }),
    /Compliance reviewer ID/,
  );
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, contentOwnerId: "other" }),
    /Content owner ID/,
  );
});

test("blocked, retained and static drafts cannot enter a write transaction", () => {
  const blocked = approvedRegister.replace(",approved,", ",blocked_pending_review,");
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, registerCsv: blocked }),
    /status is blocked_pending_review/,
  );

  const retained = loadPortugalSeoMetadataDrafts().find(
    ({ url }) => url.endsWith("/certificado-medico-carta-de-conducao"),
  )!;
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, draft: retained }),
    /retains its current metadata/,
  );

  const tool = loadPortugalSeoMetadataDrafts().find(({ targetKind }) => targetKind === "tool")!;
  assert.throws(
    () => assertPortugalSeoApplyAuthorized({ ...authorized, draft: tool }),
    /static runtime source/,
  );
});

test("Portugal database identity distinguishes PostgreSQL schemas", () => {
  assert.equal(
    portugalDatabaseIdentity("postgresql://user:secret@db.example.test/global_health?schema=clinical"),
    "postgresql://db.example.test:5432/global_health?schema=clinical",
  );
});
