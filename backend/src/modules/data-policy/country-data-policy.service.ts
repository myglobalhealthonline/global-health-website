import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { revokeTrustedDevices } from "../two-factor/login-otp.service.js";
import { createSecurityAlert } from "../security-alerts/security-alert.service.js";

// ─── PRIV-002 per-country retention hints ─────────────────────────────────────
//
// ⚠️ LEGAL SIGN-OFF PENDING (docs/security/priv-002-retention-table-2026-07-17.md).
// Retention-first defaults: clinical + financial rows are ALWAYS kept, identity
// is ALWAYS erased — behaviour is identical for every country today. This map
// only reserves a seam so a later legal review can diverge purge behaviour per
// jurisdiction WITHOUT a schema change. The year hints are informational
// (medical-record + tax retention minimums) and drive nothing yet.
const RETENTION_HINTS: Record<
  string,
  { clinicalYears: number; financialYears: number }
> = {
  PT: { clinicalYears: 15, financialYears: 10 },
  IE: { clinicalYears: 8, financialYears: 6 },
  ES: { clinicalYears: 15, financialYears: 6 },
  CZ: { clinicalYears: 10, financialYears: 10 },
  RO: { clinicalYears: 10, financialYears: 10 },
  DE: { clinicalYears: 10, financialYears: 10 },
};
const DEFAULT_RETENTION = { clinicalYears: 10, financialYears: 10 };

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataPolicyRow = {
  countryCode: string;
  retentionYears: number;
  storageRegion: string;
  requiresLocalStorage: boolean;
  legalNotes: string | null;
};

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

// ─── Data Policy CRUD ─────────────────────────────────────────────────────────

/**
 * Get data policy for a country by ISO country code.
 */
export async function getDataPolicy(
  countryCode: string,
): Promise<DataPolicyRow | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).countryDataPolicy.findUnique({
      where: { countryCode },
      select: {
        countryCode: true,
        retentionYears: true,
        storageRegion: true,
        requiresLocalStorage: true,
        legalNotes: true,
      },
    });
    return row ?? null;
  } catch (error) {
    throw normalizeDbError(error, "Could not get data policy");
  }
}

/**
 * Upsert the data policy for a country (admin only).
 */
export async function upsertDataPolicy(params: {
  countryId: string;
  countryCode: string;
  retentionYears: number;
  storageRegion: string;
  requiresLocalStorage: boolean;
  legalNotes?: string;
}): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).countryDataPolicy.upsert({
      where: { countryCode: params.countryCode },
      create: {
        countryId: params.countryId,
        countryCode: params.countryCode,
        retentionYears: params.retentionYears,
        storageRegion: params.storageRegion,
        requiresLocalStorage: params.requiresLocalStorage,
        legalNotes: params.legalNotes ?? null,
      },
      update: {
        countryId: params.countryId,
        retentionYears: params.retentionYears,
        storageRegion: params.storageRegion,
        requiresLocalStorage: params.requiresLocalStorage,
        legalNotes: params.legalNotes ?? null,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not upsert data policy");
  }
}

/**
 * List all country data policies.
 */
export async function listDataPolicies(): Promise<unknown[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma as any).countryDataPolicy.findMany({
      orderBy: { countryCode: "asc" },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not list data policies");
  }
}

// ─── Data Deletion Requests ───────────────────────────────────────────────────

/**
 * Patient submits a data deletion request (right to erasure / GDPR Art. 17).
 */
export async function createDeletionRequest(params: {
  patientProfileId: string;
  globalHealthNumber?: string | null;
  /** PRIV-002: previously discarded by the route — now persisted. */
  reason?: string | null;
  requestType?: string | null;
}): Promise<{ requestId: string }> {
  try {
    // PRIV-002: reason + requestType used to be parsed by the route then
    // dropped on the floor. No dedicated columns exist, so persist them into
    // the existing `notes` field (structured, no migration needed).
    const notesParts: string[] = [];
    if (params.requestType) notesParts.push(`requestType=${params.requestType}`);
    if (params.reason) notesParts.push(`reason: ${params.reason}`);
    const notes = notesParts.length ? notesParts.join("\n") : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any).dataDeletionRequest.create({
      data: {
        patientProfileId: params.patientProfileId,
        globalHealthNumber: params.globalHealthNumber ?? null,
        // requestStatus omitted — schema default SUBMITTED (the old literal
        // "PENDING" was not a DataDeletionStatus member and failed at the DB).
        notes,
      },
      select: { id: true },
    });
    return { requestId: record.id };
  } catch (error) {
    throw normalizeDbError(error, "Could not create deletion request");
  }
}

/**
 * Admin: list deletion requests with optional status filter.
 */
export async function listDeletionRequests(opts: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ requests: unknown[]; total: number }> {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.status) {
    where.requestStatus = opts.status;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [requests, total] = await (prisma as any).$transaction([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).dataDeletionRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).dataDeletionRequest.count({ where }),
    ]);

    return { requests, total };
  } catch (error) {
    throw normalizeDbError(error, "Could not list deletion requests");
  }
}

/**
 * Admin: update the status of a deletion request.
 */
export async function updateDeletionRequest(params: {
  requestId: string;
  requestStatus: string;
  reviewedByAdminId: string;
  legalReasonForRetention?: string;
  notes?: string;
}): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).dataDeletionRequest.update({
      where: { id: params.requestId },
      data: {
        requestStatus: params.requestStatus,
        reviewedByAdminId: params.reviewedByAdminId,
        reviewedAt: new Date(),
        legalReasonForRetention: params.legalReasonForRetention ?? null,
        notes: params.notes ?? null,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update deletion request");
  }
}

// ─── Retention sweep (report-only, Task 1d) ────────────────────────────────────

/**
 * Daily job body: for every CountryDataPolicy, count clinical records
 * (MedicalDocument) and financial/booking records (Appointment) older than
 * that country's retentionYears. REPORT-ONLY — never deletes anything; a
 * single admin-facing SecurityAlert summarizes counts per country when any
 * are found, so this can only ever surface work for an admin, not do it.
 *
 * Scoped by PatientProfile.countryFolderCode (MedicalDocument) / Appointment
 * .countryCode — same country-folder join used throughout admin-patient-
 * profile.route.ts.
 */
export async function runRetentionSweepReport(): Promise<{
  perCountry: { countryCode: string; retentionYears: number; medicalDocuments: number; appointments: number }[];
  totalOverRetention: number;
}> {
  const policies = await prisma.countryDataPolicy.findMany({
    where: { isActive: true },
    select: { countryCode: true, retentionYears: true },
  });

  const perCountry: {
    countryCode: string;
    retentionYears: number;
    medicalDocuments: number;
    appointments: number;
  }[] = [];
  let totalOverRetention = 0;

  for (const policy of policies) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - policy.retentionYears);

    const [medicalDocuments, appointments] = await Promise.all([
      prisma.medicalDocument.count({
        where: {
          createdAt: { lt: cutoff },
          patientProfile: { countryFolderCode: { equals: policy.countryCode, mode: "insensitive" } },
        },
      }),
      prisma.appointment.count({
        where: {
          createdAt: { lt: cutoff },
          countryCode: { equals: policy.countryCode, mode: "insensitive" },
        },
      }),
    ]);

    if (medicalDocuments > 0 || appointments > 0) {
      perCountry.push({ countryCode: policy.countryCode, retentionYears: policy.retentionYears, medicalDocuments, appointments });
      totalOverRetention += medicalDocuments + appointments;
    }
  }

  if (totalOverRetention > 0) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD — 24h dedupe window
    const summary = perCountry
      .map((c) => `${c.countryCode}: ${c.medicalDocuments} docs / ${c.appointments} appts over ${c.retentionYears}y`)
      .join("; ");
    await createSecurityAlert({
      severity: "LOW",
      alertType: "DATA_RETENTION_SWEEP",
      description: `Report-only retention sweep found ${totalOverRetention} record(s) past their country's retention window: ${summary}`,
      details: { perCountry },
      dedupeKey: `data_retention_sweep:${today}`,
    });
  }

  return { perCountry, totalOverRetention };
}

// ─── Anonymization ────────────────────────────────────────────────────────────

/**
 * PRIV-002 — complete a deletion/anonymization request under RETENTION-FIRST
 * defaults (⚠️ LEGAL SIGN-OFF PENDING; see
 * docs/security/priv-002-retention-table-2026-07-17.md).
 *
 * ERASES all identity, contact, national-ID, marketing and auth artifacts;
 * REVOKES every session; and RETAINS clinical + financial rows tombstoned to
 * the GHN. Every run writes an auditable completion record.
 *
 * Before this change the admin path retained email, storage keys, sessions and
 * 2FA — deletion did almost nothing. It now matches the self-service
 * grace-period purge (`purgeOneAccount` in auth.service.ts) but is keyed by
 * patientProfileId and reachable standalone by admins.
 *
 * ERASE:  User {fullName,email→tombstone,phone,dateOfBirth,passwordHash→random,
 *         2FA fields, isActive→false, tokenVersion++}; PatientProfile identity
 *         + contact + national IDs + upload keys + blind-index hashes +
 *         email→tombstone; PatientNationalityDocument {documentNumber,file keys};
 *         all TrustedDevice + LoginOtp rows; NewsletterSubscriber by email.
 * RETAIN: globalHealthNumber, all clinical columns (weight/allergies/notes/…),
 *         and every clinical + financial relation (MedicalDocument, Appointment,
 *         Order, Payment, Invoice, AuditLog) — kept tombstoned.
 */
export async function anonymizePatient(params: {
  patientProfileId: string;
  adminId: string;
}): Promise<void> {
  const { patientProfileId, adminId } = params;

  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: {
        id: true,
        userId: true,
        email: true,
        countryFolderCode: true,
        insuranceDocumentKey: true,
        idDocumentKey: true,
        idDocumentBackKey: true,
      },
    });
    if (!profile) {
      throw normalizeDbError(
        new Error("Patient profile not found"),
        "Could not anonymize patient",
      );
    }

    const retention =
      RETENTION_HINTS[profile.countryFolderCode ?? ""] ?? DEFAULT_RETENTION;
    const originalEmail = profile.email;

    // Personal-upload storage keys (login-account docs, NOT clinical
    // MedicalDocument files). No object-storage delete pipeline is wired into
    // this admin path, so the columns are nulled (unreachable through the app)
    // and the keys recorded in the completion record for a later purge job.
    const nationalityDocs = await prisma.patientNationalityDocument.findMany({
      where: { patientProfileId: profile.id },
      select: { frontFileKey: true, backFileKey: true },
    });
    const personalStorageKeys = [
      profile.insuranceDocumentKey,
      profile.idDocumentKey,
      profile.idDocumentBackKey,
      ...nationalityDocs.flatMap((d) => [d.frontFileKey, d.backFileKey]),
    ].filter((k): k is string => !!k);

    await prisma.$transaction(async (tx) => {
      // ── PatientProfile: ERASE identity, RETAIN clinical ──────────────────
      await tx.patientProfile.update({
        where: { id: profile.id },
        data: {
          fullName: null,
          phone: null,
          dateOfBirth: null,
          addressLine1: null,
          addressLine2: null,
          addressCity: null,
          addressPostalCode: null,
          nationalIdNumber: null,
          taxIdNumber: null,
          passportNumber: null,
          utenteNumber: null,
          idDocumentNumber: null,
          insurancePolicyNumber: null,
          insuranceProviderName: null,
          preferredPharmacy: null,
          // Personal-upload keys nulled; objects queued for purge (completion
          // record). Clinical MedicalDocument files are untouched (retention).
          idDocumentKey: null,
          idDocumentBackKey: null,
          insuranceDocumentKey: null,
          // Identity wiped → drop every blind index derived from it (incl.
          // emailHash now that the email is tombstoned) so the row can never
          // resolve as a dedup match.
          phoneHash: null,
          nameDobHash: null,
          emailHash: null,
          // Tombstone the globally-unique profile email, keyed by profile id,
          // so registerPatient's upsert-by-email can't relink a stranger.
          email: `deleted-${profile.id}@removed.invalid`,
          anonymizedAt: new Date(),
        },
      });

      // National-ID documents: scrub the encrypted number + file keys, keep the
      // rows (FK integrity / which doc types were held).
      await tx.patientNationalityDocument.updateMany({
        where: { patientProfileId: profile.id },
        data: { documentNumber: null, frontFileKey: null, backFileKey: null },
      });

      // Marketing: withdraw newsletter subscription entirely (no-op if absent).
      if (originalEmail) {
        await tx.newsletterSubscriber.deleteMany({
          where: { email: originalEmail },
        });
      }

      // ── User: ERASE identity + REVOKE sessions ───────────────────────────
      if (profile.userId) {
        const randomPasswordHash = await bcrypt.hash(
          randomBytes(32).toString("hex"),
          12,
        );
        await tx.user.update({
          where: { id: profile.userId },
          data: {
            fullName: "Deleted user",
            phone: null,
            dateOfBirth: null,
            email: `deleted-${profile.userId}@removed.invalid`,
            passwordHash: randomPasswordHash,
            isActive: false,
            mustChangePassword: false,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: [],
            // Session revocation: every previously-issued JWT (all devices)
            // fails the tokenVersion check on its next request.
            tokenVersion: { increment: 1 },
          },
        });
        // Email-OTP login codes — delete inside the txn (FK is Cascade on the
        // User we keep, so they must be removed explicitly).
        await tx.loginOtp.deleteMany({ where: { userId: profile.userId } });
      }
    });

    // TrustedDevice rows: reuse the shared revoker (its own deleteMany, outside
    // the txn — best-effort, deletion is already committed above).
    if (profile.userId) {
      await revokeTrustedDevices(profile.userId).catch(() => {});
    }

    // ── Auditable completion record ──────────────────────────────────────────
    await recordAudit({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "PATIENT_ANONYMIZED",
      entityType: "PatientProfile",
      entityId: patientProfileId,
      metadata: {
        adminId,
        userId: profile.userId,
        countryFolderCode: profile.countryFolderCode,
        // ⚠️ LEGAL SIGN-OFF PENDING — legal bases are the engineering default.
        fieldsErased: [
          "User.{fullName,email,phone,dateOfBirth,passwordHash,twoFactor*}",
          "PatientProfile.{identity,contact,nationalIds,uploadKeys,email,blindIndexHashes}",
          "PatientNationalityDocument.{documentNumber,frontFileKey,backFileKey}",
          "TrustedDevice(all)",
          "LoginOtp(all)",
          "NewsletterSubscriber(byEmail)",
        ],
        sessionsRevoked: true,
        categoriesRetained: {
          clinical: `RETAINED (medical-record retention ~${retention.clinicalYears}y)`,
          financial: `RETAINED (tax/financial retention ~${retention.financialYears}y)`,
        },
        // For a later batch purge job — no S3 delete pipeline on this path yet.
        personalStorageKeysQueuedForPurge: personalStorageKeys,
        legalSignOff: "PENDING",
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not anonymize patient");
  }
}
