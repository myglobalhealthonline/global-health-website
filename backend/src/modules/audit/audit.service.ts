import type { FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Append-only audit log writer. Every clinical mutation (consult save,
 * sign, exam create/delete, internal message, share link, form
 * submission) calls this. Failures are swallowed and logged — a
 * missing audit row must never roll back the surgical change.
 *
 * Reads happen out of `/admin/audit-log`; there's no public surface.
 */

type AuditAction =
  | "CONSULT_SAVED"
  | "CONSULT_SIGNED"
  | "EXAM_LOGGED"
  | "EXAM_DELETED"
  | "INTERNAL_MESSAGE_POSTED"
  | "SHARE_LINK_CREATED"
  | "SHARE_LINK_REVOKED"
  | "FORM_SUBMITTED"
  | "CONSULT_SERVICE_ADDED"
  | "CONSULT_SERVICE_REMOVED"
  | "APPOINTMENT_STATUS_CHANGED"
  | "APPOINTMENT_RESCHEDULED"
  | "FOLLOW_UP_CREATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "DOCTOR_INVITED";

type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  request?: FastifyRequest;
};

function resolveIp(request?: FastifyRequest): string | null {
  if (!request) return null;
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || null;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.split(",")[0]?.trim() || null;
  }
  return request.ip ?? null;
}

/**
 * Record an audit event. Returns a promise that resolves either way;
 * callers should `.catch()` and log instead of awaiting on the critical
 * path.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: resolveIp(input.request),
      },
    });
  } catch (err) {
    // Last-resort: log so we know if writes are silently failing.

    console.warn("[audit] failed to record event", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      err: err instanceof Error ? err.message : err,
    });
  }
}
