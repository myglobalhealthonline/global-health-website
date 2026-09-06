import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { revokeTrustedDevices } from "../two-factor/login-otp.service.js";
import { createSecurityAlert } from "../security-alerts/security-alert.service.js";
import { enqueuePersonalObjectPurge } from "../outbox/outbox.js";
import { linkAppointmentsToPatientProfile } from "../patient-profile/appointment-patient-link.js";
import { patientFolderInScope } from "../patient-merge/patient-merge.service.js";

// ─── PRIV-002 per-country retention hints ─────────────────────────────────────
//
// ⚠️ LEGAL SIGN-OFF PENDING (docs/audits/security/priv-002-retention-table-2026-07-17.md).
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

/**
 * A LOCAL_ADMIN reached for a patient outside their assigned country folders.
 * Thrown from inside the anonymization transaction, so raising it rolls back
 * everything — nothing is erased, enqueued or audited. Carries no patient
 * detail: the message is what the route sends back.
 */
export class PatientAnonymizeOutOfScopeError extends Error {
  constructor() {
    super("This patient is outside your assigned country scope");
    this.name = "PatientAnonymizeOutOfScopeError";
  }
}

// PR-5: this file used to carry a local fail-open `recordAudit` helper that
// swallowed every insert error. Its one caller was the anonymization completion
// record, which now writes on the transaction itself so a failed audit rolls the
// erasure back. Nothing else used it, so the fail-open path is gone rather than
// left available to the next caller.

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
  /** AZ-2 folder scope. `null`/undefined for ADMIN, SUPER_ADMIN and the
   *  admin-token fallback (unscoped); a lowercase folder list for a real
   *  LOCAL_ADMIN — an empty list means "sees nothing", never everything. */
  allowedCountryFolders?: string[] | null;
}): Promise<{ requests: unknown[]; total: number }> {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.status) {
    where.requestStatus = opts.status;
  }
  // Scoped in the DB query, not after the fetch: a LOCAL_ADMIN must never
  // materialize another country's deletion-request rows, and `total` has to
  // count the same set the page shows or pagination advertises rows they
  // cannot see. A patient with no folder matches no `in` list, so a null
  // folder fails closed.
  if (opts.allowedCountryFolders) {
    // `mode: "insensitive"` for the same reason `findPotentialDuplicates` needs
    // it: the allow-list is always lowercased but the stored column is not
    // always written that way (the profile auto-create in consents.route.ts
    // copies `Appointment.countryCode` verbatim). Without it an uppercase row
    // would silently vanish from its own admin's queue.
    where.patient = {
      countryFolderCode: { in: opts.allowedCountryFolders, mode: "insensitive" as const },
    };
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
 * docs/audits/security/priv-002-retention-table-2026-07-17.md).
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
  /** AZ-2 folder scope, re-checked inside the transaction. `null`/undefined
   *  for ADMIN, SUPER_ADMIN and the admin-token fallback (unscoped); a
   *  lowercase folder list for a real LOCAL_ADMIN. Passing it is what makes a
   *  route-level precheck un-bypassable: the folder is re-read on the
   *  transaction's own snapshot, so a folder changed in between cannot slip a
   *  foreign patient through. */
  allowedCountryFolders?: string[] | null;
}): Promise<void> {
  const { patientProfileId, adminId, allowedCountryFolders } = params;

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
    // MedicalDocument files). The columns are nulled below and the objects
    // themselves queued on the durable outbox in the same commit (PR-3) — this
    // used to record the raw keys in the audit row for "a later purge job"
    // that did not exist, so the files stayed in the bucket indefinitely.
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

    let personalObjectsQueuedForPurge = 0;

    await prisma.$transaction(async (tx) => {
      // ── AZ-2 authorization, on the transaction's own snapshot ────────────
      // The route already refused an out-of-scope request before opening this
      // transaction. This is the authoritative re-check, on the row this
      // transaction will actually erase, and it runs BEFORE any write so a
      // denial leaves the profile, its uploads and its audit trail untouched.
      // Same predicate as the patient-merge guard: a null folder is out of
      // scope for a LOCAL_ADMIN, never a wildcard.
      if (allowedCountryFolders) {
        const current = await tx.patientProfile.findUnique({
          where: { id: patientProfileId },
          select: { countryFolderCode: true },
        });
        // Same predicate the merge transaction uses, imported rather than
        // restated — three copies of "is this folder in the allow-list" is how
        // one of them drifts.
        if (
          !patientFolderInScope(current?.countryFolderCode ?? null, allowedCountryFolders)
        ) {
          throw new PatientAnonymizeOutOfScopeError();
        }
      }

      // ── Retained-record access: link BEFORE the email is tombstoned ──────
      // The doctor and admin patient surfaces are keyed by the address the
      // portal holds, which comes from `Appointment.email` — retained here.
      // `PatientProfile.email` is about to become a tombstone, so anything
      // still resolving by that address alone would lose the retained record.
      // Stamping the durable link first is what keeps the treating doctor,
      // ADMIN and SUPER_ADMIN reaching it afterwards. Corroborated (email AND
      // purchaser account must agree) and never overwrites an existing link.
      await linkAppointmentsToPatientProfile(tx, {
        patientProfileId: profile.id,
        email: profile.email,
        userId: profile.userId,
      });

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
          addressState: null,
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

      // PR-3: the objects behind the keys just nulled above. Queued in THIS
      // commit, so the DB references and the work that deletes the files can
      // never disagree — previously the keys went into audit metadata for a
      // purge job that did not exist, and the files stayed in the bucket.
      personalObjectsQueuedForPurge = await enqueuePersonalObjectPurge(
        tx,
        personalStorageKeys,
        { patientProfileId },
      );

      // PR-5: the anonymization audit row commits WITH the scrub. `recordAudit`
      // is deliberately fail-open and ran after the transaction, so a failed
      // audit insert used to leave the PHI erased with no record that it
      // happened. Written directly on `tx` — the smallest transaction-capable
      // write, same row shape recordAudit produces.
      await tx.auditLog.create({
        data: {
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
            // PR-3: a count, never the keys. AuditLog is long-lived and widely
            // readable; storage keys addressing identity documents are not
            // something it should carry.
            personalObjectsQueuedForPurge,
            purgeMechanism: "outbox",
            legalSignOff: "PENDING",
          },
        },
      });
    });

    // TrustedDevice rows: reuse the shared revoker (its own deleteMany, outside
    // the txn — best-effort, deletion is already committed above).
    if (profile.userId) {
      await revokeTrustedDevices(profile.userId).catch(() => {});
    }

    // The completion audit row and the object-purge queue both commit inside
    // the transaction above (PR-3/PR-5) — nothing auditable happens out here.
  } catch (error) {
    // An authorization refusal is not a database fault: normalizing it would
    // turn a 403 into a generic 500 and lose the reason.
    if (error instanceof PatientAnonymizeOutOfScopeError) throw error;
    throw normalizeDbError(error, "Could not anonymize patient");
  }
}
