import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { recordCriticalAudit } from "../audit/audit.service.js";
import { sendMedicalAccessRequestEmail } from "../../lib/email/templates.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_GRANT_DAYS = 30;
// Same pattern as PatientUploadLink / patient-upload-link.service.ts: hash-only
// storage, revocable, short TTL — no login required for the patient to act.
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export class MedicalAccessRequestNotFoundError extends Error {
  constructor() {
    super("Medical access request not found");
    this.name = "MedicalAccessRequestNotFoundError";
  }
}

function hashAccessRequestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildAccessRequestUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/access-request?token=${encodeURIComponent(token)}`;
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
    const record = await prisma.medicalAccessRequest.create({
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

    // S-008: PHI cross-country access request — audit write must not be
    // silently swallowed. Wrapped in its own try/catch: the
    // MedicalAccessRequest row above already committed, so an audit-write
    // failure here must not propagate into the outer catch and 500 a
    // request that actually succeeded (a client retry on that false 500
    // would create a duplicate MedicalAccessRequest).
    try {
      await recordCriticalAudit({
        actorUserId: params.requestingUserId,
        actorRole: "DOCTOR",
        action: "MEDICAL_ACCESS_REQUEST_CREATED",
        entityType: "MedicalAccessRequest",
        entityId: record.id,
        metadata: {
          patientProfileId: params.patientProfileId,
          requestedAccessScope: params.requestedAccessScope,
          requestingDoctorCountry: params.requestingDoctorCountry,
        },
      });
    } catch (auditError) {
      console.error(
        "[medical-access-request] CRITICAL: MEDICAL_ACCESS_REQUEST_CREATED audit write failed",
        { requestId: record.id, err: auditError instanceof Error ? auditError.message : auditError },
      );
    }

    // Mint the patient's approve/deny email token + send the notification.
    // Non-fatal: the request row above already committed, so a token/email
    // failure must not fail request creation (matches the audit-write
    // pattern above — no false 500 that would prompt a duplicate request).
    try {
      const [patient, doctor] = await Promise.all([
        prisma.patientProfile.findUnique({
          where: { id: params.patientProfileId },
          select: { email: true, fullName: true },
        }),
        prisma.doctor.findUnique({
          where: { id: params.requestingDoctorId },
          select: { fullName: true },
        }),
      ]);

      if (patient?.email) {
        const token = randomBytes(32).toString("base64url");
        const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await prisma.medicalAccessRequest.update({
          where: { id: record.id },
          data: { tokenHash: hashAccessRequestToken(token), tokenExpiresAt },
        });

        await sendMedicalAccessRequestEmail({
          to: patient.email,
          patientName: patient.fullName ?? patient.email,
          doctorName: doctor?.fullName ?? "A doctor",
          doctorCountry: params.requestingDoctorCountry,
          reason: params.reason,
          link: buildAccessRequestUrl(token),
        });
      }
    } catch (notifyError) {
      console.warn(
        "[medical-access-request] token mint / email send failed",
        { requestId: record.id, err: notifyError instanceof Error ? notifyError.message : notifyError },
      );
    }

    return { requestId: record.id, status: "PENDING" };
  } catch (error) {
    throw normalizeDbError(error, "Could not create access request");
  }
}

/**
 * Verify a patient-facing access-request token (no login). Returns a safe
 * summary only — no PHI beyond what the doctor already sees on their side.
 */
export async function verifyAccessRequestToken(
  token: string,
): Promise<
  | {
      ok: true;
      requestId: string;
      /** Internal capability binding; route responses deliberately omit it. */
      patientProfileId: string;
      doctorName: string;
      doctorCountry: string;
      requestedAccessScope: string;
      reason: string;
      createdAt: Date;
    }
  | { ok: false; message: string }
> {
  try {
    const tokenHash = hashAccessRequestToken(token);
    const request = await prisma.medicalAccessRequest.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        patientProfileId: true,
        status: true,
        tokenExpiresAt: true,
        requestingDoctorCountry: true,
        requestedAccessScope: true,
        reason: true,
        createdAt: true,
        requestingDoctorId: true,
      },
    });
    if (!request) return { ok: false, message: "Invalid access request link" };
    if (!request.tokenExpiresAt || request.tokenExpiresAt.getTime() < Date.now()) {
      return { ok: false, message: "This link has expired" };
    }
    if (request.status !== "PENDING") {
      return { ok: false, message: "This request has already been responded to" };
    }

    const doctor = request.requestingDoctorId
      ? await prisma.doctor.findUnique({
          where: { id: request.requestingDoctorId },
          select: { fullName: true },
        })
      : null;

    return {
      ok: true,
      requestId: request.id,
      patientProfileId: request.patientProfileId,
      doctorName: doctor?.fullName ?? "A doctor",
      doctorCountry: request.requestingDoctorCountry ?? "unknown",
      requestedAccessScope: request.requestedAccessScope,
      reason: request.reason,
      createdAt: request.createdAt,
    };
  } catch {
    return { ok: false, message: "Invalid access request link" };
  }
}

/**
 * Patient approves or denies a request via the emailed token link. Verifies
 * the token again (defense in depth against a route-layer bug), then
 * delegates to the same `respondToAccessRequest` the in-platform (logged-in)
 * leg uses, and invalidates the token so the link can't be replayed.
 */
export async function respondToAccessRequestByToken(params: {
  token: string;
  approved: boolean;
  patientResponseIp?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const verified = await verifyAccessRequestToken(params.token);
  if (!verified.ok) return verified;

  await respondToAccessRequest({
    requestId: verified.requestId,
    patientProfileId: verified.patientProfileId,
    approved: params.approved,
    patientResponseIp: params.patientResponseIp,
  });

  // Invalidate after use — a replayed/forwarded link must not work twice.
  // Best-effort: respondToAccessRequest already committed the decision, so a
  // failure here must not surface as an error to the patient.
  await prisma.medicalAccessRequest
    .update({ where: { id: verified.requestId }, data: { tokenHash: null, tokenExpiresAt: null } })
    .catch(() => {});

  return { ok: true };
}

/**
 * Patient approves or denies a request (called via secure token link).
 * - If approved: creates a MedicalAccessGrant (30-day default).
 * - Updates request status to APPROVED or DENIED.
 * - Audits the action.
 */
export async function respondToAccessRequest(params: {
  requestId: string;
  patientProfileId: string;
  approved: boolean;
  patientResponseIp?: string;
}): Promise<void> {
  try {
    const newStatus = params.approved ? "APPROVED" : "DENIED";

    const request = await prisma.$transaction(async (tx) => {
      const existing = await tx.medicalAccessRequest.findUnique({
        where: { id: params.requestId },
        select: {
          id: true,
          status: true,
          patientProfileId: true,
          requestingUserId: true,
          requestedAccessScope: true,
        },
      });
      // Use the same not-found response for an absent request and one owned by
      // another patient. This prevents ID probing and, critically, stops an
      // authenticated patient from approving/denying someone else's request.
      if (!existing || existing.patientProfileId !== params.patientProfileId) {
        throw new MedicalAccessRequestNotFoundError();
      }
      if (existing.status !== "PENDING") return null;
      if (params.approved && !existing.requestingUserId) {
        throw new Error(
          `Access request ${params.requestId} has no requestingUserId; cannot create grant`,
        );
      }

      // Conditional write closes the find/update race: only one concurrent
      // responder can move this exact patient's request out of PENDING.
      const transitioned = await tx.medicalAccessRequest.updateMany({
        where: {
          id: params.requestId,
          patientProfileId: params.patientProfileId,
          status: "PENDING",
        },
        data: {
          status: newStatus,
          ...(params.approved ? { approvedAt: new Date() } : { deniedAt: new Date() }),
          patientResponseIp: params.patientResponseIp ?? null,
        },
      });
      if (transitioned.count !== 1) return null;

      if (params.approved) {
        const expiresAt = new Date(Date.now() + ACCESS_GRANT_DAYS * 24 * 60 * 60 * 1000);
        await tx.medicalAccessGrant.create({
          data: {
            accessRequestId: params.requestId,
            patientProfileId: existing.patientProfileId,
            grantedToUserId: existing.requestingUserId!,
            grantedToRole: "DOCTOR",
            scope: existing.requestedAccessScope,
            expiresAt,
          },
        });
      }
      return existing;
    });

    // Already-terminal or a simultaneous responder won the conditional
    // transition. The first transaction performed the one allowed decision.
    if (!request) return;

    // S-008: PHI access grant/deny decision — audit write must not be
    // silently swallowed. Wrapped in its own try/catch: the status
    // update (and grant, if approved) above already committed, so an
    // audit-write failure here must not propagate into the outer catch and
    // 500 a request that actually succeeded (a client retry on that false
    // 500 would create a duplicate MedicalAccessGrant).
    try {
      await recordCriticalAudit({
        actorUserId: null,
        actorRole: "PATIENT",
        action: params.approved ? "MEDICAL_ACCESS_REQUEST_APPROVED" : "MEDICAL_ACCESS_REQUEST_DENIED",
        entityType: "MedicalAccessRequest",
        entityId: params.requestId,
        metadata: {
          patientProfileId: request.patientProfileId,
          patientResponseIp: params.patientResponseIp ?? null,
        },
        ipAddress: params.patientResponseIp ?? null,
      });
    } catch (auditError) {
      console.error(
        "[medical-access-request] CRITICAL: MEDICAL_ACCESS_REQUEST_APPROVED/DENIED audit write failed",
        { requestId: params.requestId, err: auditError instanceof Error ? auditError.message : auditError },
      );
    }
  } catch (error) {
    if (error instanceof MedicalAccessRequestNotFoundError) throw error;
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
    return await prisma.medicalAccessRequest.findMany({
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
    return await prisma.medicalAccessRequest.findMany({
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

  const where: Record<string, unknown> = {};
  if (opts.status) {
    where.status = opts.status;
  }
  if (opts.countryFolder) {
    where.requestingDoctorCountry = opts.countryFolder;
  }

  try {
    const [requests, total] = await prisma.$transaction([
      prisma.medicalAccessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.medicalAccessRequest.count({ where }),
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
    const grant = await prisma.medicalAccessGrant.findFirst({
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
