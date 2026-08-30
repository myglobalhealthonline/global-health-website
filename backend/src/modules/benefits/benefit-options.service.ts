import type { LocaleCode, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { resolveCountryTimeZoneById } from "../countries/country-timezone.service.js";
import { computeSlotPrice, getServicePeakConfig } from "../pricing/peak-pricing.service.js";
import {
  isDoctorInInsuranceNetwork,
  loadValidatedInsurancePrice,
} from "../pricing/insurance-pricing.service.js";
import { resolveCorporateDiscount } from "../corporate/corporate-benefit.service.js";
import { previewServiceBenefit } from "../subscriptions/checkout-pricing.service.js";
import {
  pricingEnrollmentSelect,
  priceMembershipOptions,
} from "../memberships/membership-pricing.service.js";
import type {
  MembershipPrice,
  MembershipPriceBasis,
  PricingService,
} from "../memberships/membership-pricing.service.js";

/**
 * Cross-source benefit options (§6.3) — the one place that knows about all four
 * benefit sources. It prices EVERY source the patient is eligible for against
 * the same service, so the booking form's dropdown can show real numbers side by
 * side instead of asking the patient to guess which benefit is worth using.
 *
 * It calls the existing subscription, corporate and insurance services rather
 * than reimplementing them; only the membership resolver is new. Nothing here
 * reserves or spends anything — checkout re-derives every price authoritatively
 * (§13.2), so a forged id in this response can only ever cost the patient the
 * full price, never less.
 *
 * Two known asymmetries, both deliberate:
 *
 *   - Insurance prices are peak-BLIND. `loadValidatedInsurancePrice` derives
 *     from `service.basePriceCents` internally, and §33 keeps the insurance
 *     path unchanged, so at peak times an insurance option is compared against
 *     peak-adjusted membership/corporate ones. Noted rather than fixed.
 *   - Without a `timeSlotId` prices come off the base price and percent-based
 *     options are marked `indicative`; fixed prices are exact either way, since
 *     they override peak. The booking form always has a slot by the time it
 *     asks (§11.2), so this now only affects callers that price mid-entry.
 */

export type BenefitOptionSource = "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN" | "INSURANCE";

/**
 * A structured note instead of a rendered sentence: this is an API, and the
 * booking step renders in six locales. The UI owns the copy; this owns the
 * facts it needs.
 */
export type BenefitOptionNote =
  /** "uses 1 of your N remaining" (§14) — a scarce unit, spent by choosing this. */
  | { key: "ALLOWANCE_UNIT"; remaining: number }
  /** Same shape for a plan credit, which is scarce in exactly the same way. */
  | { key: "PLAN_CREDIT"; remaining: number }
  /** The allowance is gone and the row's fallback discount applied instead. */
  | { key: "ALLOWANCE_EXHAUSTED" }
  /**
   * Decision 44's second option: the booking country's own percent/fixed rule,
   * offered beside the unit so the member can keep a scarce visit for later.
   */
  | { key: "COUNTRY_RULE" }
  /** Insurance is verified by an admin and charged later, not at checkout (§33). */
  | { key: "INSURANCE_DEFERRED" };

export type BenefitOption = {
  source: BenefitOptionSource;
  /**
   * What add-to-cart sends back to identify the choice (§11.4): enrollment id,
   * company id, insurer id, or `credit` / `discount` for a public plan (the
   * cart-level source stays PUBLIC_PLAN and phase 5 records which one in the
   * existing per-line `CartItem.benefitSelection`).
   */
  refId: string;
  label: string;
  unitPriceCents: number;
  /** `fullPriceCents - unitPriceCents`. Zero-discount options are dropped. */
  discountCents: number;
  note: BenefitOptionNote | null;
  /** True when the figure moves once a real slot is chosen (percent, no slot). */
  indicative: boolean;
  /** Cheapest option. The UI pre-selects it (§13/§14). */
  recommended: boolean;
};

export type BenefitOptionsResult = {
  /** Peak-adjusted when a slot was given, otherwise the service base price. */
  fullPriceCents: number;
  currencyCode: string;
  /** False when the price is the base one because no slot was supplied. */
  slotPriced: boolean;
  options: BenefitOption[];
};

/**
 * Tie-break order (§6.3). Deterministic ordering matters more than which order:
 * two sources landing on the same price must not swap places between the
 * booking step and a page refresh.
 */
const SOURCE_ORDER: BenefitOptionSource[] = [
  "MEMBERSHIP",
  "CORPORATE",
  "PUBLIC_PLAN",
  "INSURANCE",
];

function translatedName(
  translations: { locale: LocaleCode; name: string }[],
  locale: LocaleCode | null | undefined,
  fallback: string,
): string {
  if (!locale) return fallback;
  return translations.find((t) => t.locale === locale)?.name ?? fallback;
}

/** The peak-adjusted price for a slot, or the base price when there is none. */
async function resolveFullPrice(args: {
  service: {
    id: string;
    basePriceCents: number;
    currencyCode: string | null;
    /** Peak windows are read on the clock of the country the service is sold
     *  in, not the doctor's own country. */
    countryId: string;
  };
  fallbackCurrency: string;
  doctorId?: string | null;
  timeSlotId?: string | null;
}): Promise<{ fullPriceCents: number; currencyCode: string; slotPriced: boolean }> {
  const base = {
    fullPriceCents: args.service.basePriceCents,
    currencyCode: args.service.currencyCode ?? args.fallbackCurrency,
    slotPriced: false,
  };
  if (!args.timeSlotId || !args.doctorId) return base;

  const [slot, config] = await Promise.all([
    prisma.doctorTimeSlot.findUnique({
      where: { id: args.timeSlotId },
      select: { startAt: true, doctorId: true },
    }),
    getServicePeakConfig(args.service.id),
  ]);
  // A slot id that is not this doctor's is treated as no slot at all rather
  // than as an error: the price then falls back to the base one, which is the
  // safe direction (never cheaper than the truth).
  if (!slot || slot.doctorId !== args.doctorId) return base;

  const priced = computeSlotPrice({
    config,
    basePriceCents: args.service.basePriceCents,
    fallbackCurrency: base.currencyCode,
    slotStartUtc: slot.startAt,
    clinicTimezone: await resolveCountryTimeZoneById(args.service.countryId),
  });
  return {
    fullPriceCents: priced.unitPriceCents,
    currencyCode: priced.currencyCode,
    slotPriced: true,
  };
}

function isPercentBasis(basis: MembershipPriceBasis): boolean {
  return basis === "PERCENT" || basis === "FALLBACK_PERCENT";
}

/**
 * Every membership this account holds is priced separately (§19), and since
 * phase 7 an enrollment can produce TWO options rather than one (decision 44):
 * the included visit, and the booking country's own rule offered beside it so
 * the member can decline the unit and keep a scarce visit for later.
 *
 * The pair is emitted only when both genuinely exist — a unit is available AND
 * the country's own rule beats full price. The `:unit` / `:discount` suffix on
 * the `refId` is how add-to-cart says which one was chosen; it selects a RULE,
 * never a price, and checkout re-derives both sides regardless (§22).
 */
async function membershipOptions(args: {
  userId: string;
  service: PricingService;
  fullPriceCents: number;
  locale: LocaleCode | null;
  slotPriced: boolean;
  now: Date;
}): Promise<BenefitOption[]> {
  // Scoped to enrollments the session user OWNS. A dependent holds their own
  // account and books for themselves (§11), so a parent's session never prices
  // a dependent's enrollment here.
  const enrollments = await prisma.membershipEnrollment.findMany({
    where: { userId: args.userId, status: "ACTIVE" },
    select: pricingEnrollmentSelect,
    orderBy: { createdAt: "asc" },
  });

  const out: BenefitOption[] = [];
  for (const enrollment of enrollments) {
    const { withUnit, withoutUnit } = await priceMembershipOptions({
      enrollment,
      service: args.service,
      fullPriceCents: args.fullPriceCents,
      now: args.now,
    });

    const planName = translatedName(enrollment.plan.translations, args.locale, enrollment.plan.name);
    const levelName = translatedName(enrollment.level.translations, args.locale, enrollment.level.name);
    const label = `${planName} — ${levelName}`;

    // Both sides on offer: two options, suffixed so the choice survives
    // add-to-cart. A single option keeps the bare enrollment id, so nothing
    // that existed before phase 7 changes shape.
    const pair = withUnit && withoutUnit && withoutUnit.discountCents > 0;

    const toOption = (price: MembershipPrice, refId: string): BenefitOption => ({
      source: "MEMBERSHIP",
      refId,
      label,
      unitPriceCents: price.unitPriceCents,
      discountCents: price.discountCents,
      note:
        price.allowanceUsed && price.allowanceRemaining != null
          ? { key: "ALLOWANCE_UNIT", remaining: price.allowanceRemaining }
          : pair
            ? { key: "COUNTRY_RULE" }
            : price.basis === "FALLBACK_PERCENT" || price.basis === "FALLBACK_FIXED"
              ? { key: "ALLOWANCE_EXHAUSTED" }
              : null,
      indicative: !args.slotPriced && isPercentBasis(price.basis),
      recommended: false,
    });

    if (withUnit && withUnit.discountCents > 0) {
      out.push(toOption(withUnit, pair ? `${enrollment.id}:unit` : enrollment.id));
    }
    if (pair && withoutUnit) {
      out.push(toOption(withoutUnit, `${enrollment.id}:discount`));
    }
  }
  return out;
}

/**
 * Price every benefit source the patient can use for this service.
 * Membership/corporate/plan options are priced off `fullPriceCents`; insurance
 * carries its own negotiated rate.
 */
export async function listBenefitOptions(args: {
  userId: string;
  serviceId: string;
  doctorId?: string | null;
  timeSlotId?: string | null;
  locale?: LocaleCode | null;
  now?: Date;
}): Promise<BenefitOptionsResult | null> {
  const now = args.now ?? new Date();
  const service = await prisma.service.findUnique({
    where: { id: args.serviceId },
    select: {
      id: true,
      kind: true,
      countryId: true,
      basePriceCents: true,
      currencyCode: true,
      country: { select: { currency: { select: { code: true } } } },
    },
  });
  if (!service || service.basePriceCents == null) return null;

  const { fullPriceCents, currencyCode, slotPriced } = await resolveFullPrice({
    service: {
      id: service.id,
      basePriceCents: service.basePriceCents,
      currencyCode: service.currencyCode,
      countryId: service.countryId,
    },
    fallbackCurrency: service.country.currency.code,
    doctorId: args.doctorId,
    timeSlotId: args.timeSlotId,
  });

  const locale = args.locale ?? null;
  const [memberships, corporate, plan, insurance] = await Promise.all([
    membershipOptions({
      userId: args.userId,
      service: { id: service.id, countryId: service.countryId, kind: service.kind },
      fullPriceCents,
      locale,
      now,
      slotPriced,
    }),
    corporateOption({
      userId: args.userId,
      serviceId: service.id,
      serviceKind: service.kind,
      fullPriceCents,
      // A fixed co-pay is denominated in the plan's currency, so the engine
      // needs the line's currency to refuse a EUR co-pay on a CZK service.
      currencyCode,
      slotPriced,
    }),
    planOptions({
      userId: args.userId,
      serviceId: service.id,
      fullPriceCents,
      locale,
      slotPriced,
    }),
    insuranceOptions({ serviceId: service.id, fullPriceCents, doctorId: args.doctorId }),
  ]);

  const options = sortAndRecommend(
    [...memberships, ...corporate, ...plan, ...insurance],
    fullPriceCents,
  );
  return { fullPriceCents, currencyCode, slotPriced, options };
}

/** Sorted ascending, ties broken by source order then label (§6.3). */
export function sortAndRecommend(
  options: BenefitOption[],
  fullPriceCents: number,
): BenefitOption[] {
  const sorted = [...options].sort((a, b) => {
    if (a.unitPriceCents !== b.unitPriceCents) return a.unitPriceCents - b.unitPriceCents;
    const bySource = SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source);
    if (bySource !== 0) return bySource;
    return a.label.localeCompare(b.label);
  });
  // Only a genuinely cheaper option is worth pre-selecting. Nothing below the
  // full price means there is nothing to recommend, not "recommend the least
  // useless one".
  const first = sorted[0];
  if (first && first.unitPriceCents < fullPriceCents) first.recommended = true;
  return sorted;
}

async function corporateOption(args: {
  userId: string;
  serviceId: string;
  serviceKind: ServiceKind;
  fullPriceCents: number;
  currencyCode: string;
  slotPriced: boolean;
}): Promise<BenefitOption[]> {
  const discount = await resolveCorporateDiscount({
    userId: args.userId,
    serviceId: args.serviceId,
    serviceKind: args.serviceKind,
    baseCents: args.fullPriceCents,
    currencyCode: args.currencyCode,
  });
  if (!discount || discount.discountCents <= 0) return [];
  return [
    {
      source: "CORPORATE",
      refId: discount.companyId,
      label: `${discount.companyName} — ${discount.planName}`,
      unitPriceCents: Math.max(0, args.fullPriceCents - discount.discountCents),
      discountCents: discount.discountCents,
      note: null,
      // A percentage rule moves with peak pricing, so its figure is indicative
      // until a slot fixes the base. A co-pay or fully-included rule does not:
      // the member pays the same amount whatever the slot costs, so marking it
      // indicative would warn about a number that cannot change.
      indicative: discount.coverage === "DISCOUNT" && !args.slotPriced,
      recommended: false,
    },
  ];
}

/**
 * Up to two options: the credit and the discount. A plan credit is a scarce
 * unit exactly like a membership allowance, so it is offered with its cost
 * shown rather than spent on the patient's behalf.
 */
async function planOptions(args: {
  userId: string;
  serviceId: string;
  fullPriceCents: number;
  locale: LocaleCode | null;
  slotPriced: boolean;
}): Promise<BenefitOption[]> {
  const preview = await previewServiceBenefit({
    userId: args.userId,
    serviceId: args.serviceId,
    basePriceCents: args.fullPriceCents,
    locale: args.locale ?? undefined,
  });
  const planName = preview.planName ?? "Plan";

  return preview.options
    .filter((o) => o.selection !== "PAY_NORMAL" && o.unitPriceCents < args.fullPriceCents)
    .map((o) => ({
      source: "PUBLIC_PLAN" as const,
      refId: o.selection === "USE_PLAN_CREDIT" ? "credit" : "discount",
      label: planName,
      unitPriceCents: o.unitPriceCents,
      discountCents: args.fullPriceCents - o.unitPriceCents,
      note:
        o.selection === "USE_PLAN_CREDIT"
          ? ({
              key: "PLAN_CREDIT",
              remaining: preview.consultationCreditsRemaining,
            } as const)
          : null,
      // A credit is a flat "covered" outcome; a discount is a percentage of
      // whatever the slot costs, so only the latter moves with peak.
      indicative: !args.slotPriced && o.selection === "USE_PLAN_DISCOUNT",
      recommended: false,
    }));
}

/**
 * One option per insurer that actually covers this service — and, once a doctor
 * is in play, only the insurers that doctor is in network for (§11.3).
 *
 * The network filter is not cosmetic. A doctor joins an insurer's network by
 * having a payout row for that (company, service); without one the availability
 * query drops them entirely. Listing such an insurer beside a doctor the patient
 * has already chosen would offer a price that evaporates the moment either the
 * slot query or checkout re-derives it.
 */
async function insuranceOptions(args: {
  serviceId: string;
  fullPriceCents: number;
  doctorId?: string | null;
}): Promise<BenefitOption[]> {
  const coverages = await prisma.insuranceServiceCoverage.findMany({
    where: { serviceId: args.serviceId, company: { isActive: true } },
    select: { company: { select: { id: true, name: true } } },
  });

  const out: BenefitOption[] = [];
  for (const coverage of coverages) {
    if (
      args.doctorId &&
      !(await isDoctorInInsuranceNetwork(args.serviceId, args.doctorId, coverage.company.id))
    ) {
      continue;
    }
    // Priced through the same validated loader checkout uses, so an option can
    // never show a price the money path would refuse to honour.
    const price = await loadValidatedInsurancePrice(args.serviceId, coverage.company.id);
    if (price == null || price >= args.fullPriceCents) continue;
    out.push({
      source: "INSURANCE",
      refId: coverage.company.id,
      label: coverage.company.name,
      unitPriceCents: price,
      discountCents: args.fullPriceCents - price,
      note: { key: "INSURANCE_DEFERRED" },
      // A negotiated insurance rate is flat and peak-blind, so it does not
      // change once a slot is chosen.
      indicative: false,
      recommended: false,
    });
  }
  return out;
}
