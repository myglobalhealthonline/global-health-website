import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * 45,000 historical consultations completed on the previous platform,
 * through 2025-12-31 (inclusive). The current platform's own
 * completed-appointment count, from 2026-01-01 onward, is added on top of
 * this — see `getGlobalConsultationCount()`. A business figure from the
 * migration record, not derived from any table; change only on explicit
 * instruction from whoever owns that record, and only after confirming it
 * doesn't already include any 2026 consultations (double-counting risk).
 */
export const HISTORICAL_BASE = 45_000;

/** Live-platform counting starts here — the historical total above
 *  already covers everything through 2025-12-31. UTC, so the boundary
 *  reads the same regardless of server or requester timezone. */
export const LIVE_COUNT_START = new Date("2026-01-01T00:00:00.000Z");

/**
 * The Prisma `where` clause for "completed, paid, current-platform
 * consultations from 2026-01-01 onward" — pulled out as its own pure
 * function so the filter logic (which status, which date field, which
 * exclusions) can be unit-tested without a database. See
 * consultation-count.service.test.ts.
 *
 * `consultationCompletedAt` — not `createdAt`, not `scheduledAt` — is set
 * exactly when an appointment's status moves to `COMPLETED` (see
 * appointments.service.ts, doctor-appointments.service.ts,
 * cross-border-rx.service.ts, all three set both fields together in the
 * same update). Using it means a booking made for a future slot, or any
 * appointment still pending, doesn't count until it has actually happened.
 *
 * `CANCELLED` and every pre-completion status (`REQUEST_RECEIVED`,
 * `UNDER_REVIEW`, `CONTACTED`) are excluded by requiring `status:
 * "COMPLETED"`. `REFUNDED` is excluded separately via `paymentStatus`
 * since a refund can be issued after a consultation was completed. There
 * is no explicit no-show status in this schema — an appointment the
 * patient didn't attend is never marked `COMPLETED`, so it's excluded the
 * same way as any other unfinished appointment.
 */
export function completedSinceLiveStartWhere(
  liveStart: Date = LIVE_COUNT_START,
): Prisma.AppointmentWhereInput {
  return {
    status: "COMPLETED",
    paymentStatus: { not: "REFUNDED" },
    consultationCompletedAt: { gte: liveStart },
  };
}

/**
 * Public "consultations" trust figure: 45,000 historical consultations
 * through 2025-12-31, plus every appointment actually completed (not just
 * booked or scheduled) on this platform from 2026-01-01 onward.
 *
 * Cheap enough to call directly — callers are expected to cache the result
 * (see routes/consultation-count.route.ts's Cache-Control header and the
 * frontend fetcher's `revalidate`), not to call this per page render.
 */
export async function getGlobalConsultationCount(): Promise<number> {
  const completedSinceLiveStart = await prisma.appointment.count({
    where: completedSinceLiveStartWhere(),
  });
  return HISTORICAL_BASE + completedSinceLiveStart;
}
