import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type { CouponRejectReason } from "./coupon-eligibility.js";

/** Thrown by every path that refuses a coupon. Routes map it to 422. */
export class CouponUnavailableError extends Error {
  readonly reason: CouponRejectReason;

  constructor(reason: CouponRejectReason) {
    super(`Coupon unavailable: ${reason}`);
    this.name = "CouponUnavailableError";
    this.reason = reason;
  }
}

/** Thrown when a manual booking carries both a coupon and an admin discount. */
export class CouponAndDiscountConflictError extends Error {
  constructor() {
    super("A coupon and a manual discount cannot be applied to the same booking");
    this.name = "CouponAndDiscountConflictError";
  }
}

/**
 * Atomically claim one use of a coupon. Returns false when the cap is full, or
 * the coupon was disabled or expired between resolution and now.
 *
 * THE ONLY authoritative cap check. `resolveCoupon`'s EXHAUSTED branch is UX.
 *
 * Deliberately raw SQL rather than `updateMany`: Prisma cannot express a
 * column-against-column predicate (`redeemedCount < maxRedemptions`), so an
 * `updateMany` would need to read the row first and would reopen the
 * read-then-write window this exists to close. Two concurrent checkouts against
 * a coupon with one use left must produce exactly one winner.
 *
 * Re-asserting `active` and the validity window in the SAME statement is what
 * makes "expired between the customer pressing Apply and pressing Pay"
 * impossible to slip through, rather than merely unlikely.
 *
 * Must be called with the checkout's transaction client so a rollback undoes
 * the increment. The manual-booking path, which has no surrounding transaction,
 * compensates explicitly — see `releaseCouponSlotUnchecked`.
 */
export async function reserveCouponSlot(
  client: Prisma.TransactionClient,
  args: { couponId: string; now: Date },
): Promise<boolean> {
  const updated = await client.$executeRaw`
    UPDATE "Coupon"
       SET "redeemedCount" = "redeemedCount" + 1,
           "updatedAt" = NOW()
     WHERE "id" = ${args.couponId}
       AND "active" = true
       AND "redeemedCount" < "maxRedemptions"
       AND "validFrom" <= ${args.now}
       AND "validUntil" >= ${args.now}
  `;
  return updated === 1;
}

/**
 * Give a claimed use back without touching a redemption row. Only for the
 * manual-booking path, which reserves BEFORE the order row exists and must
 * compensate if the order write then fails. Everywhere else, use
 * `releaseCouponRedemption`, which is idempotent and keeps the audit trail.
 */
export async function releaseCouponSlotUnchecked(
  couponId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.coupon.updateMany({
    where: { id: couponId, redeemedCount: { gt: 0 } },
    data: { redeemedCount: { decrement: 1 } },
  });
}
