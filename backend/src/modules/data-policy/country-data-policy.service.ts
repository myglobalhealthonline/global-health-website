import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

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
}): Promise<{ requestId: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any).dataDeletionRequest.create({
      data: {
        patientProfileId: params.patientProfileId,
        globalHealthNumber: params.globalHealthNumber ?? null,
        requestStatus: "PENDING",
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── Anonymization ────────────────────────────────────────────────────────────

/**
 * Anonymize a patient profile — scrubs all direct PII while preserving the
 * GHN-linked clinical record.
 *
 * Fields wiped:
 *   fullName, phone, addressLine1, addressLine2, addressCity,
 *   addressPostalCode, nationalIdNumber, taxIdNumber, passportNumber,
 *   idDocumentNumber, insurancePolicyNumber, preferredPharmacy
 *
 * Fields preserved:
 *   globalHealthNumber, countryFolderCode, createdAt, and all clinical
 *   relations (MedicalDocument, consults, etc.).
 */
export async function anonymizePatient(params: {
  patientProfileId: string;
  adminId: string;
}): Promise<void> {
  const { patientProfileId, adminId } = params;

  try {
    await prisma.patientProfile.update({
      where: { id: patientProfileId },
      data: {
        fullName: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        addressCity: null,
        addressPostalCode: null,
        nationalIdNumber: null,
        taxIdNumber: null,
        passportNumber: null,
        // idDocumentNumber maps to the schema field `idDocumentNumber`
        idDocumentNumber: null,
        insurancePolicyNumber: null,
        preferredPharmacy: null,
        // Phase 2 column — cast via `as any` until migration is applied.
        ...(true
          ? ({
              anonymizedAt: new Date(),
            } as unknown as object)
          : {}),
      },
    });

    await recordAudit({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "PATIENT_ANONYMIZED",
      entityType: "PatientProfile",
      entityId: patientProfileId,
      metadata: { adminId },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not anonymize patient");
  }
}
