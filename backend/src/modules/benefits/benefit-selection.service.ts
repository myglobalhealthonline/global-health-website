import type { CartBenefitSource, LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { enrollmentGrantsBenefits } from "../memberships/membership-pricing.service.js";
import { listBenefitOptions } from "./benefit-options.service.js";

/**
 * The cart-level benefit choice (§25) — validated, then persisted so the cart,
 * the preview and checkout all price from the same decision.
 *
 * Benefits never stack: exactly one source is recorded per cart, and §6.4's
 * checkout switch runs exactly one engine off it. That is what makes
 * "no stacking" structural rather than a rule three engines each have to
 * remember.
 *
 * Nothing written here is trusted at checkout. The enrollment is re-loaded,
 * re-owned and re-priced there (§13.2); this exists so the patient is shown
 * the price they will be charged, not so the server can skip work later.
 *
 * Insurance is the exception, deliberately (§33, Q6): the per-line
 * `CartItem.insuranceCompanyId` stays authoritative for the alone-in-cart,
 * deferred-charge lifecycle, and `benefitSource = INSURANCE` is display state
 * only. Two gates that must agree would be a second thing to keep in sync, and
 * the insurance path is explicitly out of scope for changes.
 */

export type SetCartBenefitInput = {
  source: Exclude<CartBenefitSource, "UNSET">;
  refId?: string | null;
};

export type SetCartBenefitFailure = { ok: false; status: 400 | 404; message: string };
export type SetCartBenefitSuccess = {
  ok: true;
  source: CartBenefitSource;
  membershipEnrollmentId: string | null;
};

/** Which per-line selection a PUBLIC_PLAN choice maps onto. */
const PLAN_REF_TO_SELECTION = {
  credit: "USE_PLAN_CREDIT",
  discount: "USE_PLAN_DISCOUNT",
} as const;

/**
 * Record the patient's choice on their cart. Called from `POST /api/cart/items`
 * before the line is created (§11.4), so a rejected benefit never leaves a
 * half-written cart.
 *
 * The cart is still upserted rather than required. It resolves by `userId`, the
 * same key `getOrCreateUserCart` uses on the caller's side, so both writes land
 * on one cart; the upsert only matters for a first add that races cart creation.
 */
export async function setCartBenefit(
  userId: string,
  input: SetCartBenefitInput,
  now: Date = new Date(),
): Promise<SetCartBenefitSuccess | SetCartBenefitFailure> {
  let membershipEnrollmentId: string | null = null;
  let lineSelection: "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT" = "PAY_NORMAL";

  if (input.source === "MEMBERSHIP") {
    if (!input.refId) {
      return { ok: false, status: 400, message: "A membership must be chosen" };
    }
    const enrollment = await prisma.membershipEnrollment.findUnique({
      where: { id: input.refId },
      select: { id: true, userId: true, status: true, startDate: true, endDate: true },
    });
    // Same response for "not yours" and "does not exist": the id is
    // partner-supplied and potentially guessable, so the endpoint must not
    // confirm which enrollments are real.
    if (!enrollment || enrollment.userId !== userId) {
      return { ok: false, status: 404, message: "Membership not found" };
    }
    if (!enrollmentGrantsBenefits(enrollment, now)) {
      return { ok: false, status: 400, message: "That membership is not active" };
    }
    membershipEnrollmentId = enrollment.id;
  }

  if (input.source === "PUBLIC_PLAN") {
    const mapped = PLAN_REF_TO_SELECTION[input.refId as keyof typeof PLAN_REF_TO_SELECTION];
    if (!mapped) {
      return { ok: false, status: 400, message: "Choose a plan credit or a plan discount" };
    }
    lineSelection = mapped;
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId, countryCode: "", currencyCode: "" },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.cart.update({
      where: { id: cart.id },
      data: { benefitSource: input.source, membershipEnrollmentId },
    });
    // Keep the per-line selection consistent with the cart-level one. Switching
    // away from PUBLIC_PLAN must clear USE_PLAN_CREDIT off the lines, or the
    // cart preview keeps showing a credit the checkout switch will not honour.
    await tx.cartItem.updateMany({
      where: { cartId: cart.id },
      data: { benefitSelection: lineSelection },
    });
  });

  return { ok: true, source: input.source, membershipEnrollmentId };
}

/**
 * Does this patient have any benefit worth showing them for these services?
 *
 * Used for §6.4's `UNSET` runtime rule: no eligible sources means there was
 * nothing to ask about, so checkout treats the cart as `NONE` and proceeds
 * rather than bricking it.
 *
 * It asks `listBenefitOptions` — the same thing the booking form renders —
 * instead of re-deriving eligibility, so the two can never disagree about
 * whether the patient "should have" chosen something. Options that do not beat
 * the full price are already dropped there, which is the correct reading here
 * too: nothing cheaper on offer means the patient loses nothing by proceeding.
 */
export async function hasEligibleBenefitSources(args: {
  userId: string | null;
  serviceIds: string[];
  locale?: LocaleCode | null;
  now?: Date;
}): Promise<boolean> {
  if (!args.userId) return false;
  const unique = [...new Set(args.serviceIds.filter(Boolean))];
  if (unique.length === 0) return false;
  for (const serviceId of unique) {
    const result = await listBenefitOptions({
      userId: args.userId,
      serviceId,
      locale: args.locale ?? null,
      now: args.now,
    });
    if (result && result.options.length > 0) return true;
  }
  return false;
}

/**
 * Reset the benefit choice when a cart is emptied. Called from every path that
 * clears a cart — checkout (three exits), and the patient emptying it.
 *
 * Not cosmetic: `benefitSource` is not part of the item rows, so without this
 * the NEXT cart inherits the last one's decision. A stale `NONE` is the nasty
 * half — it silently suppresses a corporate member's automatic discount on
 * every future order, with no UI anywhere showing why.
 */
export function clearedCartBenefitFields(): Prisma.CartUncheckedUpdateInput {
  return { benefitSource: "UNSET", membershipEnrollmentId: null };
}
