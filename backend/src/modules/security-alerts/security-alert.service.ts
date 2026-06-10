import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CreateAlertParams = {
  severity: AlertSeverity;
  alertType: string;
  patientId?: string | null;
  globalHealthNumber?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  countryFolder?: string | null;
  description: string;
  details?: Record<string, unknown>;
  /**
   * If a dedupeKey is provided and an OPEN alert with the same key already
   * exists today, the new alert is silently skipped. Prevents noise when
   * a frequent code path fires repeatedly for the same root cause.
   */
  dedupeKey?: string;
  relatedAccessLogId?: string | null;
};

type ListAlertsOpts = {
  status?: string;
  severity?: string;
  countryFolder?: string;
  limit?: number;
  offset?: number;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Start-of-day UTC for the "same day" dedupe window. */
function todayUtcStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Core alert creation
// ---------------------------------------------------------------------------

/**
 * Create a security alert. Async, fire-and-forget friendly — never throws.
 * Any error is swallowed and logged so callers (audit hooks, access guards)
 * are never broken by a failing alert write.
 *
 * Deduplication: if `dedupeKey` is set, an existing OPEN alert with that key
 * created today causes this call to no-op silently.
 */
export async function createSecurityAlert(
  params: CreateAlertParams,
): Promise<void> {
  try {
    // Dedupe check — one DB round-trip, bounded to today's rows.
    if (params.dedupeKey) {
      const existing = await (prisma as any).securityAlert.findFirst({
        where: {
          dedupeKey: params.dedupeKey,
          status: "OPEN",
          createdAt: { gte: todayUtcStart() },
        },
        select: { id: true },
      });

      if (existing) {
        return; // Duplicate — skip silently.
      }
    }

    await (prisma as any).securityAlert.create({
      data: {
        severity: params.severity,
        alertType: params.alertType,
        patientId: params.patientId ?? null,
        globalHealthNumber: params.globalHealthNumber ?? null,
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        countryFolder: params.countryFolder ?? null,
        description: params.description,
        details: params.details
          ? (params.details as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        dedupeKey: params.dedupeKey ?? null,
        relatedAccessLogId: params.relatedAccessLogId ?? null,
        status: "OPEN",
      },
    });
  } catch (err) {
    // Last-resort console.warn so infra logging captures the failure
    // without ever breaking the caller.
    console.warn("[security-alert] failed to create alert", {
      alertType: params.alertType,
      severity: params.severity,
      dedupeKey: params.dedupeKey,
      err: err instanceof Error ? err.message : err,
    });
  }
}

// ---------------------------------------------------------------------------
// Admin — list alerts
// ---------------------------------------------------------------------------

/**
 * List security alerts with optional filters, pagination.
 * Returns the filtered rows and the total unfiltered count for the same
 * filter set (for pagination UIs).
 */
export async function listSecurityAlerts(
  opts: ListAlertsOpts,
): Promise<{ alerts: unknown[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.severity ? { severity: opts.severity } : {}),
    ...(opts.countryFolder ? { countryFolder: opts.countryFolder } : {}),
  };

  const [alerts, total] = await (prisma as any).$transaction([
    (prisma as any).securityAlert.findMany({
      where,
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    (prisma as any).securityAlert.count({ where }),
  ]);

  return { alerts, total };
}

// ---------------------------------------------------------------------------
// Admin — update alert status
// ---------------------------------------------------------------------------

/**
 * Update an alert's status (e.g. OPEN → INVESTIGATING → RESOLVED).
 * Optionally records which admin resolved it.
 */
export async function updateAlertStatus(
  alertId: string,
  status: string,
  resolvedByAdminId?: string,
): Promise<void> {
  await (prisma as any).securityAlert.update({
    where: { id: alertId },
    data: {
      status,
      ...(resolvedByAdminId ? { resolvedByAdminId } : {}),
      ...(status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Fire a HIGH-severity alert when a medical record access attempt is
 * unauthorized. Called from `assertMedicalAccess`.
 *
 * Uses a dedupeKey scoped to (actor, patient, day) so repeated denied
 * attempts within the same UTC day only create one alert, not a storm.
 */
export async function alertUnauthorizedAccess(opts: {
  actorId: string;
  actorRole: string;
  patientId: string;
  globalHealthNumber?: string | null;
  countryFolder?: string | null;
  description: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dedupeKey = `unauthorized_access:${opts.actorId}:${opts.patientId}:${today}`;

  await createSecurityAlert({
    severity: "HIGH",
    alertType: "UNAUTHORIZED_MEDICAL_ACCESS",
    patientId: opts.patientId,
    globalHealthNumber: opts.globalHealthNumber ?? null,
    actorId: opts.actorId,
    actorRole: opts.actorRole,
    countryFolder: opts.countryFolder ?? null,
    description: opts.description,
    details: opts.details,
    dedupeKey,
  });
}

/**
 * Fire a MEDIUM-severity alert for a suspicious login event (e.g. brute
 * force detected, login from unusual IP, rate limit breach).
 *
 * DedupeKey scoped to (userId, reason, IP, day) to avoid duplicate storms.
 */
export async function alertSuspiciousLogin(opts: {
  userId: string;
  email: string;
  ipAddress: string;
  reason: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const dedupeKey = `suspicious_login:${opts.userId}:${opts.reason}:${opts.ipAddress}:${today}`;

  await createSecurityAlert({
    severity: "MEDIUM",
    alertType: "SUSPICIOUS_LOGIN",
    actorId: opts.userId,
    actorRole: "USER",
    description: opts.reason,
    details: {
      email: opts.email,
      ipAddress: opts.ipAddress,
      reason: opts.reason,
      ...opts.details,
    },
    dedupeKey,
  });
}
