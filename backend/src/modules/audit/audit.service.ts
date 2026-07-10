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
  /** Explicit IP override for callers with no FastifyRequest on hand (e.g.
   *  a token-authenticated public endpoint that only has a raw IP string).
   *  Takes precedence over `request` when both are given. */
  ipAddress?: string | null;
};

function resolveIp(input: Pick<AuditInput, "request" | "ipAddress">): string | null {
  if (input.ipAddress !== undefined) return input.ipAddress;
  if (!input.request) return null;
  // Use Fastify's resolved client IP. With `trustProxy: 1` (set in app.ts)
  // this is the real client address derived from the single trusted edge
  // proxy hop — never a value the client can spoof by injecting its own
  // X-Forwarded-For chain. Parsing the raw header here would trust the
  // left-most (client-claimed) entry and defeat audit forensics.
  return input.request.ip ?? null;
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
    await prisma.auditLog.create({ data: toAuditLogData(input) });
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

function toAuditLogData(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  return {
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata
      ? (input.metadata as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    ipAddress: resolveIp(input),
  };
}

/**
 * S-008 hardening: for PHI / money / admin-identity / security-sensitive
 * mutations, a swallowed audit-write failure means the action happened
 * with no durable evidence — unacceptable for a regulated platform.
 *
 * Same write as `recordAudit`, but on failure this logs loudly (console.error,
 * not console.warn) AND rethrows. Callers on sensitive paths MUST `await`
 * this (never fire-and-forget / `.catch(() => {})`) so the failure surfaces
 * as a request error the caller/ops can see and react to, instead of
 * vanishing. This does not make the write transactional with the mutation
 * it documents (the mutation has typically already committed by the time
 * this runs) — it only guarantees the failure is never silent.
 *
 * Scope this to call sites the S-008 finding actually calls dangerous:
 * payment/refund actions, admin-user identity mutations (role/password),
 * medical-access grant decisions, and PHI-document access. Do not use for
 * routine/low-stakes audit logging.
 */
export async function recordCriticalAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({ data: toAuditLogData(input) });
  } catch (err) {
    console.error("[audit] CRITICAL: failed to record sensitive audit event", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId ?? null,
      err: err instanceof Error ? err.message : err,
    });
    throw new Error(
      `Audit log write failed for sensitive action ${input.action} on ${input.entityType}:${input.entityId}`,
      { cause: err },
    );
  }
}
