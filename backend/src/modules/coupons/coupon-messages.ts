import type { CouponRejectReason } from "./coupon-eligibility.js";

/**
 * STAFF-FACING reason text. Deliberately specific — an admin on the phone needs
 * to know the code is locked to somebody else's address, not merely that it
 * "did not work".
 *
 * The PUBLIC endpoint does the opposite for identity reasons: see
 * coupons.route.ts, where they all collapse into one message so the endpoint is
 * not an enumeration oracle. Do not reuse this map there.
 */
const ADMIN_MESSAGES: Record<CouponRejectReason, string> = {
  NOT_FOUND: "No coupon with that code.",
  INACTIVE: "That coupon has been disabled.",
  NOT_STARTED: "That coupon is not valid yet.",
  EXPIRED: "That coupon has expired.",
  EXHAUSTED: "That coupon has been fully redeemed.",
  EMAIL_MISMATCH: "That coupon is reserved for a different email address.",
  COMMISSION_MARKET: "Coupons cannot be used in this market.",
  COVERAGE_LINE: "Coupons cannot be combined with insurance or a coverage card.",
  BENEFIT_LINE: "Coupons cannot be combined with a membership, corporate or plan benefit.",
  SCOPE_MISMATCH: "That coupon does not cover this type of consultation.",
  BELOW_MINIMUM: "That coupon leaves an amount too small for the payment provider to charge.",
};

export function couponRejectMessage(reason: CouponRejectReason): string {
  return ADMIN_MESSAGES[reason];
}
