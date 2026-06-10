import type { FastifyRequest } from "fastify";
import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Append-only audit log writer. Every clinical mutation (consult save,
 * sign, exam create/delete, internal message, share link, form
 * submission) calls this. Failures are swallowed and logged — a
 * missing audit row must never roll back the surgical change.
 *
 * Reads happen out of `/admin/audit-log`; there's no public surface.
 */

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
  // Use Fastify's resolved client IP. With `trustProxy: 1` (set in app.ts)
  // this is the real client address derived from the single trusted edge
  // proxy hop — never a value the client can spoof by injecting its own
  // X-Forwarded-For chain. Parsing the raw header here would trust the
  // left-most (client-claimed) entry and defeat audit forensics.
  return request.ip ?? null;
}

/**
 * Convenience wrapper: record a hard-delete (purge) of an admin entity.
 * Fire-and-forget — never blocks or fails the request.
 */
export function recordEntityPurge(
  request: FastifyRequest,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): void {
  recordAudit({
    actorRole: "ADMIN",
    action: "ENTITY_PURGED",
    entityType,
    entityId,
    ...(metadata ? { metadata } : {}),
    request,
  }).catch(() => {});
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
