import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../lib/blind-index.js";
import { sendPatientMergeNotificationEmail } from "../../lib/email/templates.js";
import { movePatientEmailReferences } from "../patient-profile/patient-email-move.js";

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

  // Populated inside the transaction below, read afterwards for the
  // fire-and-forget notification email.
  let mergeLogId = "";

  try {
    await prisma.$transaction(async (tx) => {
      // Read the authoritative rows inside the transaction (not the outer
      // `prisma` client) so the whole read-decide-write sequence is atomic —
      // a snapshot read before the transaction opens could go stale between
      // the read and these writes.
      const [primarySnapshot, duplicateSnapshot] = await Promise.all([
        tx.patientProfile.findUniqueOrThrow({ where: { id: primaryPatientId } }),
        tx.patientProfile.findUniqueOrThrow({ where: { id: duplicatePatientId } }),
      ]);
      // ── 1. Write the merge log with both snapshots ───────────────────────
      const mergeLog = await tx.patientMergeLog.create({
        data: {
          primaryPatientId,
          duplicatePatientId,
          mergedByAdminId: adminId,
          reason,
          primarySnapshot: primarySnapshot as object,
          duplicateSnapshot: duplicateSnapshot as object,
        },
      });
      mergeLogId = mergeLog.id;

      // ── 2. Re-point FK references duplicate → primary ────────────────────

      // Appointment.userId — only re-point when the duplicate actually has a
      // userId. If userId is null/undefined, where: { userId: undefined }
      // would make Prisma ignore the filter and corrupt every appointment row.
      if (duplicateSnapshot.userId) {
        await tx.appointment.updateMany({
          where: { userId: duplicateSnapshot.userId },
          data: { userId: primarySnapshot.userId ?? null },
        });
      }

      // MedicalDocument
      await tx.medicalDocument.updateMany({
        where: { patientProfileId: duplicatePatientId },
        data: { patientProfileId: primaryPatientId },
      });

      // Everything else hanging off the duplicate's User row. Appointment was
      // handled above; these were missed, and Order in particular meant a
      // merged patient's unpaid order stayed attached to an account that no
      // longer represents them — including the address its payment reminders
      // are sent to.
      if (duplicateSnapshot.userId && primarySnapshot.userId) {
        const from = duplicateSnapshot.userId;
        const to = primarySnapshot.userId;

        await tx.order.updateMany({ where: { userId: from }, data: { userId: to } });
        await tx.userSubscription.updateMany({ where: { userId: from }, data: { userId: to } });
        await tx.consultationCreditLedger.updateMany({ where: { userId: from }, data: { userId: to } });
        await tx.wellnessCreditLedger.updateMany({ where: { userId: from }, data: { userId: to } });
        await tx.healthTestRedemption.updateMany({ where: { userId: from }, data: { userId: to } });
        await tx.membershipEnrollment.updateMany({ where: { userId: from }, data: { userId: to } });

        // Cart.userId is unique, so a blind move collides whenever both
        // accounts have one. The primary's cart is the live one — the
        // duplicate's is an abandoned basket, not a record we owe the patient.
        const primaryCart = await tx.cart.findFirst({
          where: { userId: to },
          select: { id: true },
        });
        if (!primaryCart) {
          await tx.cart.updateMany({ where: { userId: from }, data: { userId: to } });
        }

        // The duplicate account must stop being a way in. Its credentials were
        // mailed to whatever address created it — often the very typo that
        // caused the duplicate — and after this merge it holds no records of
        // its own worth signing in for.
        await tx.passwordResetToken.updateMany({
          where: { userId: from, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.user.update({
          where: { id: from },
          data: { isActive: false, tokenVersion: { increment: 1 } },
        });
      }

      // The tables that store the patient's address by value rather than by
      // foreign key — appointments, orders, notes, generated documents,
      // membership rows. `consultation-history` assembles the chart by
      // matching `patientEmail` against the profile's address, so notes and
      // documents left on the duplicate's address would be missing from the
      // surviving patient's own history — the exact opposite of what a merge
      // is for. This reverses an earlier decision to treat `patientEmail` as
      // untouchable history: it reads as history only while the two addresses
      // belong to two people, and a merge is the assertion that they don't.
      await movePatientEmailReferences(
        tx,
        duplicateSnapshot.email,
        primarySnapshot.email,
      );

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
    }, {
      // A merge re-points ~20 tables, each a separate round trip. Against a
      // hosted database that comfortably exceeds Prisma's 5s default and the
      // whole merge rolls back with P2028 — the failure is clean, but the
      // merge can never succeed. Widened to fit the round trips rather than
      // splitting the work up, because a half-applied merge (records moved,
      // duplicate still active) is far worse than a slow one.
      timeout: 30_000,
      maxWait: 10_000,
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

    // ── 5. Notify the surviving patient (fire-and-forget) ──────────────────
    // Never blocks the merge response and never throws — a failed send just
    // leaves patientInformed at its default `false` for later follow-up.
    // Re-read post-commit (not the stale pre-merge tx snapshot) so the email
    // reflects the current surviving record.
    prisma.patientProfile
      .findUnique({
        where: { id: primaryPatientId },
        select: { email: true, fullName: true },
      })
      .then((primary) => {
        if (!primary?.email) return;
        return sendPatientMergeNotificationEmail({
          to: primary.email,
          patientName: primary.fullName ?? "there",
        }).then(() =>
          prisma.patientMergeLog.update({
            where: { id: mergeLogId },
            data: { patientInformed: true },
          }),
        );
      })
      .catch((err) => {
        console.warn("[patient-merge] could not send merge notification email", {
          mergeLogId,
          err: err instanceof Error ? err.message : err,
        });
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
