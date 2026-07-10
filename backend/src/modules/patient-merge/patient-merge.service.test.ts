import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";
import { deleteMedicalAccessLogs } from "../../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * SF12 (code review 2026-07-05): patient-merge re-points 8 different FK
 * tables and had zero test coverage despite touching PHI records across
 * every one of them. This proves the repoint actually happens (not just
 * that the transaction commits) across a representative sample, plus the
 * merge-log snapshot and isMerged flag the rest of the app depends on.
 */
describe("patient-merge", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./patient-merge.service.js");
  let bootError: unknown = null;

  const uniq = `merge-test-${Date.now()}`;
  let primaryId: string;
  let duplicateId: string;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./patient-merge.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    const primary = await prisma.patientProfile.create({
      data: { email: `primary-${uniq}@test.local`, fullName: "Primary Patient" },
    });
    const duplicate = await prisma.patientProfile.create({
      data: { email: `duplicate-${uniq}@test.local`, fullName: "Duplicate Patient" },
    });
    primaryId = primary.id;
    duplicateId = duplicate.id;

    await prisma.medicalDocument.create({
      data: {
        patientProfileId: duplicateId,
        uploadedByRole: "PATIENT",
        documentType: "REPORT",
        title: "Test doc",
        fileKey: `test/${uniq}.pdf`,
        fileName: "test.pdf",
        mimetype: "application/pdf",
        byteSize: 100,
      },
    });
    await prisma.patientConsent.create({
      data: { patientProfileId: duplicateId, consentType: "STORE_MEDICAL", consentValue: true },
    });
    await prisma.medicalAccessLog.create({
      data: {
        patientProfileId: duplicateId,
        accessedByRole: "PATIENT",
        accessedResourceType: "MEDICAL_DOC",
        accessAction: "VIEWED",
      },
    });
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  it("re-points MedicalDocument, PatientConsent, and MedicalAccessLog from duplicate to primary", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await svc.mergePatients({
      primaryPatientId: primaryId,
      duplicatePatientId: duplicateId,
      adminId: "admin-test",
      reason: "duplicate account (test)",
    });

    const doc = await prisma.medicalDocument.findFirst({
      where: { title: "Test doc", patientProfileId: { in: [primaryId, duplicateId] } },
    });
    assert.equal(doc?.patientProfileId, primaryId, "MedicalDocument repointed to primary");

    const consent = await prisma.patientConsent.findFirst({
      where: { consentType: "STORE_MEDICAL", patientProfileId: primaryId },
    });
    assert.ok(consent, "PatientConsent repointed to primary");

    const log = await prisma.medicalAccessLog.findFirst({
      where: { accessedResourceType: "MEDICAL_DOC", patientProfileId: primaryId },
    });
    assert.ok(log, "MedicalAccessLog repointed to primary");

    // Nothing left pointing at the duplicate.
    const orphanDoc = await prisma.medicalDocument.findFirst({
      where: { patientProfileId: duplicateId },
    });
    assert.equal(orphanDoc, null, "no MedicalDocument rows remain on the duplicate");
  });

  it("marks the duplicate as merged", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const status = await svc.getMergeStatus(duplicateId);
    assert.equal(status.isMerged, true);
    assert.equal(status.mergedIntoPatientId, primaryId);
    assert.ok(status.mergedAt);
  });

  it("primary profile is not marked merged", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const status = await svc.getMergeStatus(primaryId);
    assert.equal(status.isMerged, false);
  });

  it("writes a merge log with both pre-merge snapshots", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const log = await prisma.patientMergeLog.findFirst({
      where: { primaryPatientId: primaryId, duplicatePatientId: duplicateId },
    });
    assert.ok(log, "merge log row exists");
    assert.equal((log!.primarySnapshot as { email: string }).email, `primary-${uniq}@test.local`);
    assert.equal((log!.duplicateSnapshot as { email: string }).email, `duplicate-${uniq}@test.local`);
  });

  it("findPotentialDuplicates excludes already-merged profiles", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const duplicates = await svc.findPotentialDuplicates(primaryId);
    assert.ok(
      !duplicates.some((d) => d.patientProfileId === duplicateId),
      "merged duplicate is not surfaced as a potential match",
    );
  });

  it("getMergeStatus on a nonexistent profile returns not-merged rather than throwing", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const status = await svc.getMergeStatus("nonexistent-profile-id");
    assert.equal(status.isMerged, false);
    assert.equal(status.mergedIntoPatientId, null);
  });

  it("cleans up fixtures", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await deleteMedicalAccessLogs(prisma, { patientProfileId: { in: [primaryId, duplicateId] } });
    await prisma.patientConsent.deleteMany({ where: { patientProfileId: { in: [primaryId, duplicateId] } } });
    await prisma.medicalDocument.deleteMany({ where: { patientProfileId: { in: [primaryId, duplicateId] } } });
    await prisma.patientMergeLog.deleteMany({ where: { primaryPatientId: primaryId } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: [primaryId, duplicateId] } } });
  });
});
