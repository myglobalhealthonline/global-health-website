import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Consultations completed on the previous platform, through 2026-06-30
 * (inclusive). The current platform's own completed-appointment count is
 * added on top of this — see `getGlobalConsultationCount()`. A business
 * figure from the migration record, not derived from any table; change
 * only on explicit instruction from whoever owns that record.
 */
export const HISTORICAL_BASE = 45_000;

/** Current-platform counting starts here — the historical total above
 *  already covers everything before this instant. UTC, so the cutover
 *  reads the same regardless of server or requester timezone. */
export const CUTOVER_AT = new Date("2026-07-01T00:00:00.000Z");

/**
 * The Prisma `where` clause for "completed, paid, current-platform
 * consultations since cutover" — pulled out as its own pure function so the
 * filter logic (which status, which date field, which exclusions) can be
 * unit-tested without a database. See consultation-count.service.test.ts.
 *
 * `consultationCompletedAt` — not `createdAt`, not `scheduledAt` — is set
 * exactly when an appointment's status moves to `COMPLETED` (see
 * appointments.service.ts, doctor-appointments.service.ts,
 * cross-border-rx.service.ts, all three set both fields together in the
 * same update). Using it means a June booking for a July slot, or any
 * appointment still pending/scheduled in the future, doesn't count until
 * it has actually happened.
 *
 * `CANCELLED` and every pre-completion status (`REQUEST_RECEIVED`,
 * `UNDER_REVIEW`, `CONTACTED`) are excluded by requiring `status:
 * "COMPLETED"`. `REFUNDED` is excluded separately via `paymentStatus`
 * since a refund can be issued after a consultation was completed. There
 * is no explicit no-show status in this schema — an appointment the
 * patient didn't attend is never marked `COMPLETED`, so it's excluded the
 * same way as any other unfinished appointment.
 */
export function completedSinceCutoverWhere(
  cutover: Date = CUTOVER_AT,
): Prisma.AppointmentWhereInput {
  return {
    status: "COMPLETED",
    paymentStatus: { not: "REFUNDED" },
    consultationCompletedAt: { gte: cutover },
  };
}

/**
 * Public "consultations" trust figure: the historical total from the
 * previous platform, plus every appointment actually completed (not just
 * booked or scheduled) on this platform since the 2026-07-01 cutover.
 *
 * Cheap enough to call directly — callers are expected to cache the result
 * (see routes/consultation-count.route.ts's Cache-Control header and the
 * frontend fetcher's `revalidate`), not to call this per page render.
 */
export async function getGlobalConsultationCount(): Promise<number> {
  const completedSinceCutover = await prisma.appointment.count({
    where: completedSinceCutoverWhere(),
  });
  return HISTORICAL_BASE + completedSinceCutover;
}
