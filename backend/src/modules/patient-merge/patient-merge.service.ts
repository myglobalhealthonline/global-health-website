import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../lib/blind-index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recordAudit(params: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await (prisma as unknown as {
      auditLog: { create: (args: unknown) => Promise<unknown> };
    }).auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action as never,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? null,
      },
    });
  } catch {
    // Fire-and-forget — never block the main path.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Find potential duplicates for a patient profile using blind indexes.
 * Matches on emailHash, phoneHash, or nameDobHash.
 */
export async function findPotentialDuplicates(
  patientProfileId: string,
): Promise<
  Array<{
    patientProfileId: string;
    globalHealthNumber: string | null;
    fullName: string | null;
    email: string;
    matchReasons: string[];
  }>
> {
  try {
    const source = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: {
        email: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
      },
    });

    if (!source) {
      throw new Error(`PatientProfile ${patientProfileId} not found`);
    }

    // Re-derive the blind indexes from the source row's plain values.
    const emailHash = computeEmailBlindIndex(source.email);
    const phoneHash = source.phone ? computePhoneBlindIndex(source.phone) : null;

    const dobIso = source.dateOfBirth
      ? source.dateOfBirth.toISOString().slice(0, 10)
      : null;
    const nameDobHash =
      source.fullName && dobIso
        ? computeNameDobBlindIndex(source.fullName, dobIso)
        : null;

    // Build OR filter on whichever hashes we have.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orClauses: Record<string, unknown>[] = [];
    if (emailHash) orClauses.push({ emailHash });
    if (phoneHash) orClauses.push({ phoneHash });
    if (nameDobHash) orClauses.push({ nameDobHash });

    if (orClauses.length === 0) {
      return [];
    }

    const candidates = await prisma.patientProfile.findMany({
      where: {
        AND: [
          { id: { not: patientProfileId } },
          { isMerged: false },
          { OR: orClauses },
        ],
      },
      select: {
        id: true,
        globalHealthNumber: true,
        fullName: true,
        email: true,
        emailHash: true,
        phoneHash: true,
        nameDobHash: true,
        isMerged: true,
      },
    });

    return candidates.map((c) => {
      const matchReasons: string[] = [];
      if (emailHash && c.emailHash === emailHash) matchReasons.push("email");
      if (phoneHash && c.phoneHash === phoneHash) matchReasons.push("phone");
      if (nameDobHash && c.nameDobHash === nameDobHash) matchReasons.push("name_dob");

      return {
        patientProfileId: c.id,
        globalHealthNumber: c.globalHealthNumber,
        fullName: c.fullName,
        email: c.email,
        matchReasons,
      };
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not find potential duplicates");
  }
}

/**
 * Admin merges a duplicate patient into a primary patient.
 * Runs inside a Prisma transaction. Re-points all FK references.
 * Marks the duplicate as merged and audits both patient records.
 */
export async function mergePatients(params: {
  primaryPatientId: string;
  duplicatePatientId: string;
  adminId: string;
  reason: string;
}): Promise<void> {
  const { primaryPatientId, duplicatePatientId, adminId, reason } = params;

  try {
    // Pre-fetch both records for the JSON snapshot (outside tx — read-only,
    // and we need them before the transaction modifies the duplicate).
    const [primarySnapshot, duplicateSnapshot] = await Promise.all([
      prisma.patientProfile.findUniqueOrThrow({ where: { id: primaryPatientId } }),
      prisma.patientProfile.findUniqueOrThrow({ where: { id: duplicatePatientId } }),
    ]);

    await prisma.$transaction(async (tx) => {
      // ── 1. Write the merge log with both snapshots ───────────────────────
      await tx.patientMergeLog.create({
        data: {
          primaryPatientId,
          duplicatePatientId,
          mergedByAdminId: adminId,
          reason,
          primarySnapshot: primarySnapshot as object,
          duplicateSnapshot: duplicateSnapshot as object,
        },
      });

      // ── 2. Re-point FK references duplicate → primary ────────────────────

      // Re-read userId fresh inside the transaction rather than trusting the
      // pre-tx snapshot — an admin action editing the duplicate's userId in
      // the narrow window between the snapshot read and this transaction
      // could otherwise repoint appointments using a stale value.
      const freshDuplicate = await tx.patientProfile.findUniqueOrThrow({
        where: { id: duplicatePatientId },
        select: { userId: true },
      });

      // Appointment.userId — only re-point when the duplicate actually has a
      // userId. If userId is null/undefined, where: { userId: undefined }
      // would make Prisma ignore the filter and corrupt every appointment row.
      if (freshDuplicate.userId) {
        await tx.appointment.updateMany({
          where: { userId: freshDuplicate.userId },
          data: { userId: primarySnapshot.userId ?? null },
        });
      }

      // MedicalDocument
      await tx.medicalDocument.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // MedicalNote — patientEmail column stays as-is on the note row.
      // We do NOT touch patientEmail; it is a historical snapshot.
      // (No FK from MedicalNote to PatientProfile — joined by email, not id.)

      // PatientConsent
      await tx.patientConsent.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // MedicalAccessLog
      await tx.medicalAccessLog.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // PatientNationalityDocument
      await tx.patientNationalityDocument.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // PatientContactChangeLog (Phase 2 model)
      await tx.patientContactChangeLog.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // MedicalAccessRequest (Phase 2 model)
      await tx.medicalAccessRequest.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // DataDeletionRequest (Phase 2 model)
      await tx.dataDeletionRequest.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // MedicalAccessGrant (Phase 2 model — was missing)
      await tx.medicalAccessGrant.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // ── 3. Mark the duplicate as merged ─────────────────────────────────
      await tx.patientProfile.update({
        where: { id: duplicatePatientId },
        data: {
          isMerged: true,
          mergedIntoPatientId: primaryPatientId,
          mergedAt: new Date(),
          mergedByAdminId: adminId,
        },
      });
    });

    // ── 4. Audit both records (fire-and-forget) ────────────────────────────
    // Same metadata key (relatedPatientId) on both sides, described from
    // each record's own perspective via `role` — was two different key
    // names (duplicatePatientId / mergedIntoPrimaryPatientId) for the same
    // relationship, which made downstream audit-log queries fiddlier than
    // necessary.
    await recordAudit({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "PATIENT_MERGED",
      entityType: "PatientProfile",
      entityId: primaryPatientId,
      metadata: {
        role: "primary",
        relatedPatientId: duplicatePatientId,
        reason,
      },
    });
    await recordAudit({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "PATIENT_MERGED",
      entityType: "PatientProfile",
      entityId: duplicatePatientId,
      metadata: {
        role: "duplicate",
        relatedPatientId: primaryPatientId,
        reason,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not merge patients");
  }
}

/**
 * Return the merge status for a patient profile.
 */
export async function getMergeStatus(patientProfileId: string): Promise<{
  isMerged: boolean;
  mergedIntoPatientId: string | null;
  mergedAt: Date | null;
}> {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: {
        isMerged: true,
        mergedIntoPatientId: true,
        mergedAt: true,
      },
    });

    if (!profile) {
      return { isMerged: false, mergedIntoPatientId: null, mergedAt: null };
    }

    return {
      isMerged: profile.isMerged ?? false,
      mergedIntoPatientId: profile.mergedIntoPatientId ?? null,
      mergedAt: profile.mergedAt ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not get merge status");
  }
}
