import type { LocaleCode, Prisma } from "@prisma/client";
import {
  enrollmentGrantsBenefits,
  pricingEnrollmentSelect,
  resolveMembershipPrice,
  selectBenefitRow,
} from "./membership-pricing.service.js";
import type {
  MembershipPriceBasis,
  PricingBenefitRow,
  PricingEnrollment,
  PricingService,
} from "./membership-pricing.service.js";
import { balanceKey } from "./membership-allowance.service.js";

/**
 * The membership engine's checkout pass (§6.4) — one of exactly one engine
 * that runs per order.
 *
 * Everything here re-derives from the database inside the checkout
 * transaction. The cart's stored enrollment id is an input to be validated,
 * never a price to be trusted: a forged or stale id fails the checkout with a
 * 400 rather than silently downgrading to full price, because a silent
 * downgrade charges a different number than the one the patient confirmed
 * (§13.2).
 *
 * Allowance units go to the first eligible lines in cart order (§25); later
 * lines fall to the benefit row's fallback, then to full price. The counts
 * here are a PROJECTION used to price the order — the authoritative spend is
 * the conditional counter update in `spendAllowanceUnit`, which runs once the
 * order lines exist and can take the last unit away from us if a concurrent
 * checkout got there first. `applyAllowanceOutcome` re-prices that line.
 */

export type MembershipLinePrice = {
  benefitId: string;
  unitPriceCents: number;
  discountCents: number;
  basis: MembershipPriceBasis;
  allowanceUsed: boolean;
  /** The row that governed this line — the spend pass needs it for the counter. */
  benefit: PricingBenefitRow;
  /** Carried so a lost allowance race can re-price without re-reading. */
  service: PricingService;
};

export type MembershipCheckoutPlan = {
  enrollment: PricingEnrollment;
  /**
   * Patient-facing names for the chosen plan and level, with their
   * translations. Carried out of here because `PricingEnrollment` deliberately
   * models only what PRICING reads — but the cart panel has to name the
   * benefit, or a €0 line looks like a bug to the person paying.
   */
  naming: {
    planName: string;
    levelName: string;
    planTranslations: { locale: LocaleCode; name: string }[];
    levelTranslations: { locale: LocaleCode; name: string }[];
  };
  /** Keyed by CART item id. Lines with no benefit are simply absent. */
  lines: Map<string, MembershipLinePrice>;
};

export class MembershipCheckoutError extends Error {}

type CheckoutItem = {
  id: string;
  serviceId: string | null;
};

/**
 * Validate the cart's membership choice and price every line against it.
 *
 * @throws MembershipCheckoutError when the choice cannot be honoured — no
 *   enrollment recorded, not the session user's, or no longer active. All are
 *   400s at the route, never a downgrade.
 */
export async function planMembershipCheckout(
  tx: Prisma.TransactionClient,
  args: {
    userId: string | null;
    enrollmentId: string | null;
    items: CheckoutItem[];
    /** Peak-resolved price per CART item id — what the line costs without a benefit. */
    fullPriceByItemId: Map<string, number>;
    now?: Date;
  },
): Promise<MembershipCheckoutPlan> {
  const now = args.now ?? new Date();
  if (!args.userId || !args.enrollmentId) {
    throw new MembershipCheckoutError("No membership was chosen for this order");
  }

  const enrollment = await tx.membershipEnrollment.findUnique({
    where: { id: args.enrollmentId },
    select: pricingEnrollmentSelect,
  });
  // §6.3 scopes options to the session user's own enrollments; dependents hold
  // their own accounts and book for themselves (§11), so "belongs to someone
  // whose primary is me" is deliberately NOT accepted here.
  if (!enrollment || enrollment.userId !== args.userId) {
    throw new MembershipCheckoutError("That membership is not available on this account");
  }
  if (!enrollmentGrantsBenefits(enrollment, now)) {
    throw new MembershipCheckoutError("That membership is not active");
  }

  const serviceIds = [...new Set(args.items.map((i) => i.serviceId).filter(Boolean))] as string[];
  const services = serviceIds.length
    ? await tx.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, countryId: true, kind: true },
      })
    : [];
  const serviceById = new Map(services.map((s) => [s.id, s]));

  // Units left per benefit row before this order touches anything. Read once:
  // two lines governed by the same row must not both see the full balance.
  const projected = new Map<string, number>();
  const remainingFor = async (benefit: PricingBenefitRow): Promise<number> => {
    const cached = projected.get(benefit.id);
    if (cached != null) return cached;
    const balance = await tx.membershipAllowanceBalance.findUnique({
      where: { benefitId_holderEnrollmentId_termStart: balanceKey(enrollment, benefit.id) },
      select: { allocated: true, used: true },
    });
    // No row yet means nothing has been spent — the counter is created lazily.
    const remaining = balance
      ? Math.max(0, balance.allocated - balance.used)
      : (benefit.allowanceCount ?? 0);
    projected.set(benefit.id, remaining);
    return remaining;
  };

  const lines = new Map<string, MembershipLinePrice>();
  for (const item of args.items) {
    const service = item.serviceId ? serviceById.get(item.serviceId) : null;
    if (!service) continue;
    const fullPriceCents = args.fullPriceByItemId.get(item.id);
    if (fullPriceCents == null) continue;

    const benefit = selectBenefitRow(enrollment.level.benefits, service);
    if (!benefit) continue;
    const allowanceRemaining = await remainingFor(benefit);
    const price = resolveMembershipPrice({
      enrollment,
      service,
      fullPriceCents,
      allowanceRemaining,
      now,
    });
    if (!price) continue;
    if (price.allowanceUsed) {
      // One unit per LINE, not per unit of quantity: the ledger's
      // `${orderItemId}:SPEND` key structurally allows exactly one, and the
      // booking flow cannot produce a consultation line with quantity > 1
      // (each carries its own unique time slot).
      projected.set(benefit.id, Math.max(0, allowanceRemaining - 1));
    }
    lines.set(item.id, {
      benefitId: price.benefitId,
      unitPriceCents: price.unitPriceCents,
      discountCents: price.discountCents,
      basis: price.basis,
      allowanceUsed: price.allowanceUsed,
      benefit,
      service,
    });
  }

  return {
    enrollment,
    naming: {
      planName: enrollment.plan.name,
      levelName: enrollment.level.name,
      planTranslations: enrollment.plan.translations,
      levelTranslations: enrollment.level.translations,
    },
    lines,
  };
}

/**
 * Re-price a line whose allowance spend lost the race for the last unit.
 * Same resolver, told the pool is empty, so it lands on the row's fallback or
 * on the full price exactly as §6.2 says an exhausted allowance should.
 */
export function repriceWithoutAllowance(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  fullPriceCents: number;
  now?: Date;
}): { unitPriceCents: number; discountCents: number; basis: MembershipPriceBasis | null } {
  const price = resolveMembershipPrice({ ...args, allowanceRemaining: 0 });
  if (!price) {
    return { unitPriceCents: args.fullPriceCents, discountCents: 0, basis: null };
  }
  return {
    unitPriceCents: price.unitPriceCents,
    discountCents: price.discountCents,
    basis: price.basis,
  };
}
