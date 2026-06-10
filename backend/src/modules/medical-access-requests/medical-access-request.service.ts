import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_GRANT_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recordAudit(params: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await (prisma as unknown as Record<string, unknown> & {
      auditLog: { create: (args: unknown) => Promise<unknown> };
    }).auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action as never,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch {
    // Audit failures are fire-and-forget — never block the main path.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Doctor creates a request to access a patient file from another country.
 */
export async function createAccessRequest(params: {
  patientProfileId: string;
  requestingDoctorId: string;
  requestingUserId: string;
  requestingDoctorCountry: string;
  requestedAccessScope: string;
  reason: string;
}): Promise<{ requestId: string; status: "PENDING" }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any).medicalAccessRequest.create({
      data: {
        patientProfileId: params.patientProfileId,
        requestingDoctorId: params.requestingDoctorId,
        requestingUserId: params.requestingUserId,
        requestingDoctorCountry: params.requestingDoctorCountry,
        requestedAccessScope: params.requestedAccessScope,
        reason: params.reason,
        status: "PENDING",
      },
      select: { id: true },
    });

    await recordAudit({
      actorUserId: params.requestingUserId,
      actorRole: "DOCTOR",
      action: "ACCESS_REQUEST_CREATED",
      entityType: "MedicalAccessRequest",
      entityId: record.id,
      metadata: {
        patientProfileId: params.patientProfileId,
        requestedAccessScope: params.requestedAccessScope,
        requestingDoctorCountry: params.requestingDoctorCountry,
      },
    });

    return { requestId: record.id, status: "PENDING" };
  } catch (error) {
    throw normalizeDbError(error, "Could not create access request");
  }
}

/**
 * Patient approves or denies a request (called via secure token link).
 * - If approved: creates a MedicalAccessGrant (30-day default).
 * - Updates request status to APPROVED or DENIED.
 * - Audits the action.
 */
export async function respondToAccessRequest(params: {
  requestId: string;
  approved: boolean;
  patientResponseIp?: string;
}): Promise<void> {
  try {
    const newStatus = params.approved ? "APPROVED" : "DENIED";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request = await (prisma as any).medicalAccessRequest.update({
      where: { id: params.requestId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        patientResponseIp: params.patientResponseIp ?? null,
      },
      select: {
        id: true,
        patientProfileId: true,
        requestingUserId: true,
      },
    });

    if (params.approved) {
      const expiresAt = new Date(Date.now() + ACCESS_GRANT_DAYS * 24 * 60 * 60 * 1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).medicalAccessGrant.create({
        data: {
          accessRequestId: params.requestId,
          patientProfileId: request.patientProfileId,
          grantedToUserId: request.requestingUserId,
          expiresAt,
        },
      });
    }

    await recordAudit({
      actorUserId: null,
      actorRole: "PATIENT",
      action: params.approved ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_DENIED",
      entityType: "MedicalAccessRequest",
      entityId: params.requestId,
      metadata: {
        patientProfileId: request.patientProfileId,
        patientResponseIp: params.patientResponseIp ?? null,
      },
      ipAddress: params.patientResponseIp ?? null,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not process access request response");
  }
}

/**
 * List all pending access requests for a given patient profile.
 */
export async function listPendingRequestsForPatient(
  patientProfileId: string,
): Promise<unknown[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma as any).medicalAccessRequest.findMany({
      where: {
        patientProfileId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not list access requests");
  }
}

/**
 * List all access requests sent by a given doctor (by doctorId).
 */
export async function listRequestsByDoctor(
  doctorId: string,
): Promise<unknown[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma as any).medicalAccessRequest.findMany({
      where: { requestingDoctorId: doctorId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not list access requests");
  }
}

/**
 * Admin: list all requests with optional filters.
 */
export async function listAllRequests(opts: {
  status?: string;
  countryFolder?: string;
  limit?: number;
  offset?: number;
}): Promise<{ requests: unknown[]; total: number }> {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, unknown> = {};
  if (opts.status) {
    where.status = opts.status;
  }
  if (opts.countryFolder) {
    where.requestingDoctorCountry = opts.countryFolder;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [requests, total] = await (prisma as any).$transaction([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).medicalAccessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).medicalAccessRequest.count({ where }),
    ]);

    return { requests, total };
  } catch (error) {
    throw normalizeDbError(error, "Could not list access requests");
  }
}

/**
 * Check whether a doctor has a live (non-expired, non-revoked) grant for
 * a patient. Used by access guard middleware.
 */
export async function hasLiveGrant(
  doctorUserId: string,
  patientProfileId: string,
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grant = await (prisma as any).medicalAccessGrant.findFirst({
      where: {
        grantedToUserId: doctorUserId,
        patientProfileId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      select: { id: true },
    });
    return grant !== null;
  } catch (error) {
    throw normalizeDbError(error, "Could not check access grant");
  }
}
