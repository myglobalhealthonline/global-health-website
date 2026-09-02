import type { CouponKind, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { isCommissionCountry } from "../orders/commission.service.js";
import { isValidCouponCodeShape, normalizeCouponCode } from "./coupon-code.js";

/**
 * Why a coupon was refused.
 *
 * The split matters for what the customer is told (see coupons.route.ts):
 *
 *  - IDENTITY reasons say something about the CODE, so they all collapse into
 *    one opaque public message. Distinguishing "expired" from "no such code"
 *    turns the endpoint into an enumeration oracle — the same reasoning as the
 *    membership claim form's deliberate absence of a "not found" state.
 *  - ELIGIBILITY reasons say something about the CART. They do confirm the code
 *    exists, which is an accepted trade: a customer holding a code we emailed
 *    them, told only "invalid", contacts support.
 */
export type CouponIdentityRejectReason =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "EMAIL_MISMATCH";

export type CouponEligibilityRejectReason =
  | "COMMISSION_MARKET"
  | "COVERAGE_LINE"
  | "BENEFIT_LINE"
  | "BELOW_MINIMUM";

export type CouponRejectReason = CouponIdentityRejectReason | CouponEligibilityRejectReason;

const IDENTITY_REASONS: ReadonlySet<string> = new Set<CouponIdentityRejectReason>([
  "NOT_FOUND",
  "INACTIVE",
  "NOT_STARTED",
  "EXPIRED",
  "EXHAUSTED",
  "EMAIL_MISMATCH",
]);

export function isIdentityReason(reason: CouponRejectReason): boolean {
  return IDENTITY_REASONS.has(reason);
}

export type ResolvedCoupon = {
  id: string;
  code: string;
  kind: CouponKind;
  discountPercent: number;
  validUntil: Date;
};

export type ResolveCouponResult =
  | { ok: true; coupon: ResolvedCoupon }
  | { ok: false; reason: CouponRejectReason };

export type ResolveCouponInput = {
  code: string;
  /** The PAYER's email (`Order.email`), lowercased by us. Null = not known yet. */
  email: string | null;
  /** Booking country — coupons are refused in commission markets. */
  countryCode: string;
  /** Any line priced by insurance or a declared coverage card. */
  hasCoverageLine: boolean;
  /** Any line priced by a membership, corporate or subscription-plan benefit. */
  hasBenefitLine: boolean;
  now?: Date;
  client?: Prisma.TransactionClient;
};

/**
 * Read-only. Safe to call from a public endpoint and again inside the checkout
 * transaction — it writes nothing. The cap check here is ADVISORY: only
 * `reserveCouponSlot` is authoritative about whether a use is actually left.
 *
 * The ORDER of the checks is the product decision, because the first failure is
 * the message the customer sees. Identity first (is this code usable at all),
 * then eligibility (is this cart allowed to use it).
 */
export async function resolveCoupon(input: ResolveCouponInput): Promise<ResolveCouponResult> {
  const db = input.client ?? prisma;
  const now = input.now ?? new Date();
  const code = normalizeCouponCode(input.code);

  // A malformed code is reported as NOT_FOUND, never as its own reason — a
  // distinct "bad format" reply narrows the search space for a guesser. The
  // lookup below still runs on well-formed codes only, but the reply is the
  // same shape either way.
  if (!code || !isValidCouponCodeShape(code)) return { ok: false, reason: "NOT_FOUND" };

  const coupon = await db.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      kind: true,
      discountPercent: true,
      personalEmail: true,
      validFrom: true,
      validUntil: true,
      maxRedemptions: true,
      redeemedCount: true,
      active: true,
    },
  });

  if (!coupon) return { ok: false, reason: "NOT_FOUND" };
  if (!coupon.active) return { ok: false, reason: "INACTIVE" };
  if (now < coupon.validFrom) return { ok: false, reason: "NOT_STARTED" };
  if (now > coupon.validUntil) return { ok: false, reason: "EXPIRED" };
  if (coupon.redeemedCount >= coupon.maxRedemptions) return { ok: false, reason: "EXHAUSTED" };

  if (coupon.kind === "PERSONAL") {
    // Locked to the PAYER's address, not the patient's: a parent booking for a
    // child spends their own coupon, which is the intended behaviour.
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!email || email !== (coupon.personalEmail ?? "")) {
      return { ok: false, reason: "EMAIL_MISMATCH" };
    }
  }

  // Commission markets: the doctor's payout is a contracted share of what the
  // patient paid, so a promotion we ran would silently reduce their fee or push
  // our commission negative. Refused outright rather than picking a side.
  if (await isCommissionCountry(input.countryCode)) {
    return { ok: false, reason: "COMMISSION_MARKET" };
  }

  // Insurance / declared-coverage prices are contractual — the checkout already
  // refuses to let any other engine layer on top of them.
  if (input.hasCoverageLine) return { ok: false, reason: "COVERAGE_LINE" };

  // No stacking on membership / corporate / plan benefits.
  if (input.hasBenefitLine) return { ok: false, reason: "BENEFIT_LINE" };

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      kind: coupon.kind,
      discountPercent: coupon.discountPercent,
      validUntil: coupon.validUntil,
    },
  };
}
