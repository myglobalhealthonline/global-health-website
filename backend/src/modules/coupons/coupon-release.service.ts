import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Give back the coupon use an order was holding.
 *
 * Idempotent by conditional update, which is required rather than tidy: the
 * cancel paths race each other (the checkout catch, the admin CANCELLED
 * transition, the pre-payment sweep, a refund webhook), and a second caller
 * must not decrement the counter twice. `count === 0` means somebody already
 * released it.
 *
 * Mirrors `refundAllowanceUnit` in the membership allowance service.
 */
export async function releaseCouponRedemption(
  orderId: string,
  reason: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<"released" | "no-op"> {
  const redemption = await client.couponRedemption.findUnique({
    where: { orderId },
    select: { id: true, couponId: true, status: true },
  });
  if (!redemption || redemption.status === "RELEASED") return "no-op";

  const updated = await client.couponRedemption.updateMany({
    where: { orderId, status: { in: ["RESERVED", "CONSUMED"] } },
    data: { status: "RELEASED", releasedAt: new Date(), releaseReason: reason.slice(0, 500) },
  });
  if (updated.count === 0) return "no-op";

  // Guarded by `redeemedCount > 0` so a counter that somehow already reached
  // zero cannot be driven negative past the CHECK constraint.
  await client.coupon.updateMany({
    where: { id: redemption.couponId, redeemedCount: { gt: 0 } },
    data: { redeemedCount: { decrement: 1 } },
  });
  return "released";
}

/**
 * Mark the use as actually spent. Called from
 * `completeOrderPaymentFromCheckoutSession` — the single funnel behind the
 * Stripe webhook, the zero-total free path and the manual booking's synthetic
 * `free_<orderId>` session, so one hook covers all three.
 *
 * The counter does NOT move here: the use was already claimed at order
 * creation. This only records that it stuck.
 */
export async function markCouponRedemptionConsumed(
  orderId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.couponRedemption.updateMany({
    where: { orderId, status: "RESERVED" },
    data: { status: "CONSUMED", consumedAt: new Date() },
  });
}
