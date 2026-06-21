import { prisma } from "../../../db/prisma.js";
import { releaseReservation } from "../../credits/credit-balance.service.js";
import { releaseRedemption } from "../redemption.service.js";

/**
 * Ops sweeps (§28/§39). Fail-CLOSED: any error throws (the repo cron is
 * fail-open, so callers must surface). Idempotent — safe to run every 5 min.
 */

const CANCEL_GRACE_DAYS = 14;

/**
 * Release reservations whose checkout was terminally abandoned (order CANCELLED
 * / missing) AND past their TTL (§36.3). The terminal-uniqueness guard makes a
 * release that races a late commit a no-op, so this can never double-free a
 * credit.
 */
export async function sweepExpiredReservations(now = new Date()): Promise<{
  consultationReleased: number;
  wellnessReleased: number;
}> {
  let consultationReleased = 0;
  let wellnessReleased = 0;

  // ── Consultation reservations ──────────────────────────────────────
  const cRows = await prisma.consultationCreditLedger.findMany({
    where: { reason: "RESERVED", reservedUntil: { lt: now }, reservationId: { not: null } },
    select: {
      reservationId: true,
      userSubscriptionId: true,
      userId: true,
      deltaCredits: true,
      orderItemId: true,
    },
  });
  for (const r of cRows) {
    if (r.orderItemId) {
      const item = await prisma.orderItem.findUnique({
        where: { id: r.orderItemId },
        select: { order: { select: { status: true } } },
      });
      // Only release terminally-abandoned orders — never an open/paid checkout.
      if (item?.order && item.order.status !== "CANCELLED") continue;
    }
    const outcome = await prisma.$transaction((tx) =>
      releaseReservation(tx, {
        userSubscriptionId: r.userSubscriptionId,
        userId: r.userId,
        kind: "CONSULTATION",
        amount: Math.abs(r.deltaCredits),
        reservationId: r.reservationId!,
      }),
    );
    if (outcome === "released") consultationReleased += 1;
  }

  // ── Wellness reservations (drive through releaseRedemption) ─────────
  const wRows = await prisma.wellnessCreditLedger.findMany({
    where: { reason: "RESERVED", reservedUntil: { lt: now }, reservationId: { not: null } },
    select: { reservationId: true },
  });
  for (const r of wRows) {
    const redemption = await prisma.healthTestRedemption.findUnique({
      where: { id: r.reservationId! },
      select: { status: true, order: { select: { status: true } } },
    });
    if (!redemption || redemption.status !== "REQUESTED") continue;
    if (redemption.order && redemption.order.status !== "CANCELLED") continue;
    await releaseRedemption(r.reservationId!);
    wellnessReleased += 1;
  }

  return { consultationReleased, wellnessReleased };
}

/**
 * Cancel-after-grace (§28): a PAST_DUE subscription whose paid period ended more
 * than CANCEL_GRACE_DAYS ago transitions to CANCELED. Stripe owns dunning — this
 * sends NO customer email.
 */
export async function cancelAfterGrace(now = new Date()): Promise<{ canceled: number }> {
  const cutoff = new Date(now.getTime() - CANCEL_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.userSubscription.updateMany({
    where: {
      status: "PAST_DUE",
      currentPeriodEnd: { lt: cutoff },
    },
    data: { status: "CANCELED", canceledAt: now },
  });
  return { canceled: result.count };
}
