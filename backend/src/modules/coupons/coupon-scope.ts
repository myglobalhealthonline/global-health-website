import type { CartItemKind, CouponScope } from "@prisma/client";

/**
 * Which lines a coupon may discount.
 *
 * Enforced per LINE rather than per order: a cart holding a GP consultation and
 * a health test, with a GP-only coupon, gets the cut on the consultation and
 * pays full price for the test. A cart with NOTHING in scope is refused
 * outright (`SCOPE_MISMATCH`) rather than quietly applying a zero discount —
 * "your code did nothing" is the one outcome worth engineering against.
 *
 * ANY is the default and what every coupon minted before scoping existed
 * carries, so this returns true for them on every line.
 */
export function couponAppliesToKind(scope: CouponScope, kind: CartItemKind): boolean {
  switch (scope) {
    case "GENERAL_CONSULTATION":
      return kind === "GENERAL_CONSULTATION";
    case "SPECIALIST_CONSULTATION":
      return kind === "SPECIALIST_CONSULTATION";
    case "CONSULTATIONS":
      return kind === "GENERAL_CONSULTATION" || kind === "SPECIALIST_CONSULTATION";
    case "ANY":
    default:
      return true;
  }
}

/** True when at least one line of the cart can take this coupon. */
export function couponAppliesToAnyLine(
  scope: CouponScope,
  kinds: ReadonlyArray<CartItemKind>,
): boolean {
  return kinds.some((kind) => couponAppliesToKind(scope, kind));
}

/** Staff- and customer-facing label for the scope. */
export const COUPON_SCOPE_LABELS: Record<CouponScope, string> = {
  ANY: "Any booking",
  GENERAL_CONSULTATION: "GP consultations only",
  SPECIALIST_CONSULTATION: "Specialist consultations only",
  CONSULTATIONS: "GP and specialist consultations",
};
