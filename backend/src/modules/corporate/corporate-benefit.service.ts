import type { CorporateCoverage, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { percentDiscountAmountCents } from "../subscriptions/pricing-resolver.js";
import {
  companyIsLive,
  getActiveMembershipForUser,
} from "./corporate-shared.js";

export type CorporateDiscount = {
  /** Which rule priced the line. Stamped on the OrderItem — it IS the
   *  annual-limit counter, so it must survive to checkout. */
  ruleId: string;
  coverage: CorporateCoverage;
  /** Effective percentage off, derived for EVERY coverage (a €20 co-pay on a
   *  €50 service reports 60). Kept truthful rather than zeroed so any display
   *  that only knows about percentages still shows a correct number. */
  discountPercent: number;
  /** What the member pays, COPAY only. Null for INCLUDED/DISCOUNT. */
  copayCents: number | null;
  discountCents: number;
  companyId: string;
  companyName: string;
  planName: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
};

/** The rule fields pricing actually needs. */
type RuleRow = {
  id: string;
  serviceId: string | null;
  serviceKind: ServiceKind | null;
  coverage: CorporateCoverage;
  discountPercent: number;
  copayCents: number | null;
  annualLimit: number | null;
  limitGroup: string | null;
  appliesToBeneficiaries: boolean;
};

const RULE_SELECT = {
  id: true,
  serviceId: true,
  serviceKind: true,
  coverage: true,
  discountPercent: true,
  copayCents: true,
  annualLimit: true,
  limitGroup: true,
  appliesToBeneficiaries: true,
} as const;

/** Rules sharing a group share one counter — "Physiotherapy or Chiropractic
 *  (up to 5x)" is 5 across both, not 5 each. Ungrouped rules count alone. */
function limitKey(rule: RuleRow): string {
  return rule.limitGroup ?? rule.id;
}

/**
 * What the member pays under this rule, or null when the rule cannot price the
 * line (misconfigured co-pay, 0% discount).
 *
 * The co-pay is clamped to the service price: a €20 co-pay on a €15 service
 * charges €15. Charging a member MORE than the public price because their
 * employer bought them a benefit is the one outcome this must never produce.
 */
function memberPriceCents(
  rule: RuleRow,
  baseCents: number,
  /** False when the line is priced in a currency the co-pay is not denominated
   *  in. See `copayApplies`. */
  copayUsable = true,
): number | null {
  switch (rule.coverage) {
    case "INCLUDED":
      return 0;
    case "COPAY":
      if (rule.copayCents == null || !copayUsable) return null;
      return Math.min(Math.max(0, rule.copayCents), baseCents);
    default:
      if (rule.discountPercent <= 0) return null;
      return Math.max(0, baseCents - percentDiscountAmountCents(baseCents, rule.discountPercent));
  }
}

/**
 * Whether a fixed co-pay may price a line at all.
 *
 * `copayCents` is denominated in the PLAN's currency (EUR for every plan we
 * sell). A service priced in CZK or RON is a different unit entirely, and
 * applying a €20 co-pay to it would charge 20 CZK — roughly €0.80 — for a
 * consultation worth twenty times that. No FX conversion happens anywhere in
 * the pricing chain, so the only safe answer is that the co-pay does not apply:
 * the member falls through to the plan's percentage rule, which is
 * currency-agnostic by construction.
 *
 * An unpriced service (null currency) is treated as matching — it has no
 * conflicting unit to disagree with.
 */
function copayApplies(
  planCurrencyCode: string | null | undefined,
  serviceCurrencyCode: string | null | undefined,
): boolean {
  if (!planCurrencyCode || !serviceCurrencyCode) return true;
  return planCurrencyCode.toUpperCase() === serviceCurrencyCode.toUpperCase();
}

/**
 * The rule that leaves the member paying least, within the winning tier.
 *
 * Tiering is unchanged from v1: a rule pinned to this exact service beats any
 * kind rule. What is new is that a tier can hold several rules — a plan carries
 * both the sitewide 15% employee-benefit-program row and (say) an INCLUDED row
 * on GENERAL — so within the tier the best member price wins. Picking by array
 * order instead would make the outcome depend on row insertion order.
 *
 * `exhausted` removes rules whose annual limit is spent BEFORE tiering, so a
 * used-up pinned rule falls through to the kind rules rather than blocking them.
 */
function pickRule(
  rules: RuleRow[],
  input: {
    serviceId: string;
    serviceKind: ServiceKind;
    baseCents: number;
    memberType: "EMPLOYEE" | "BENEFICIARY";
    /** Default true — see `copayApplies`. */
    copayUsable?: boolean;
    exhausted?: (rule: RuleRow) => boolean;
  },
): { rule: RuleRow; memberPrice: number } | null {
  const eligible = rules.filter(
    (rule) =>
      (input.memberType !== "BENEFICIARY" || rule.appliesToBeneficiaries) &&
      !(input.exhausted?.(rule) ?? false),
  );
  const pinned = eligible.filter((rule) => rule.serviceId === input.serviceId);
  const byKind = eligible.filter((rule) => !rule.serviceId && rule.serviceKind === input.serviceKind);
  const tier = pinned.length > 0 ? pinned : byKind;

  let best: { rule: RuleRow; memberPrice: number } | null = null;
  for (const rule of tier) {
    const memberPrice = memberPriceCents(rule, input.baseCents, input.copayUsable ?? true);
    // A rule that leaves the member at full price is not a benefit, and
    // stamping it would burn an annual-limit use for nothing.
    if (memberPrice == null || memberPrice >= input.baseCents) continue;
    if (!best || memberPrice < best.memberPrice) best = { rule, memberPrice };
  }
  return best;
}

/**
 * Start of the contract year the company is currently in — the
 * `contractStartAt` anniversary. A contract signed in September resets its
 * allowances each September, not each January.
 *
 * ponytail: a Feb-29 contract start lands on Mar 1 in non-leap years (JS
 * `setUTCFullYear` rolls over). One day of drift on a yearly window; a
 * day-of-year calendar would be the fix if it ever matters.
 */
export function contractYearStart(contractStartAt: Date, now: Date = new Date()): Date {
  const anniversary = new Date(contractStartAt);
  anniversary.setUTCFullYear(contractStartAt.getUTCFullYear() + (now.getUTCFullYear() - contractStartAt.getUTCFullYear()));
  if (anniversary.getTime() > now.getTime()) {
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() - 1);
  }
  return anniversary;
}

/**
 * Uses already consumed this contract year, keyed by `limitKey`.
 *
 * The count IS the authority — there is no balance row and no ledger. Order
 * lines carry the rule id, so a cancelled or refunded order drops out of the
 * count on its own and the use comes back with no release path to forget. Only
 * capped rules are queried, so an uncapped plan costs nothing here.
 *
 * ponytail: two checkouts racing for the last covered visit can both pass —
 * the read is not locked. Losing that race costs the plan one extra covered
 * consultation, not money the member was charged. A row lock (as the membership
 * allowance balance uses) is the upgrade if overspend ever needs to be exact.
 */
async function loadUsage(
  userId: string,
  rules: RuleRow[],
  windowStart: Date,
): Promise<Map<string, number>> {
  const used = new Map<string, number>();
  const capped = rules.filter((rule) => rule.annualLimit != null);
  if (capped.length === 0) return used;

  const rows = await prisma.orderItem.groupBy({
    by: ["corporateBenefitRuleId"],
    where: {
      corporateBenefitRuleId: { in: capped.map((rule) => rule.id) },
      order: {
        userId,
        // PENDING counts: an unpaid checkout is holding the use, and the
        // 15-minute pay window cancels it (releasing it) if it never pays.
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: { gte: windowStart },
      },
    },
    _sum: { quantity: true },
  });

  const byRuleId = new Map(capped.map((rule) => [rule.id, rule]));
  for (const row of rows) {
    const rule = row.corporateBenefitRuleId ? byRuleId.get(row.corporateBenefitRuleId) : undefined;
    if (!rule) continue;
    const key = limitKey(rule);
    used.set(key, (used.get(key) ?? 0) + (row._sum.quantity ?? 0));
  }
  return used;
}

/** The cap that applies to a group. Rules in one group should carry the same
 *  limit; when they disagree the most generous one governs, because the
 *  alternative is silently honouring a smaller number the admin never saw. */
function groupLimit(rules: RuleRow[], key: string): number | null {
  let limit: number | null = null;
  for (const rule of rules) {
    if (limitKey(rule) !== key || rule.annualLimit == null) continue;
    limit = limit == null ? rule.annualLimit : Math.max(limit, rule.annualLimit);
  }
  return limit;
}

/**
 * Exhaustion test over a live tally, so several lines in ONE cart cannot each
 * spend the same last use. `pending` is mutated by the caller as it allocates.
 */
function makeExhaustedTest(rules: RuleRow[], used: Map<string, number>, pending: Map<string, number>) {
  return (rule: RuleRow): boolean => {
    if (rule.annualLimit == null) return false;
    const key = limitKey(rule);
    const limit = groupLimit(rules, key);
    if (limit == null) return false;
    return (used.get(key) ?? 0) + (pending.get(key) ?? 0) >= limit;
  };
}

function toDiscount(
  picked: { rule: RuleRow; memberPrice: number },
  baseCents: number,
  membership: { company: { id: string; name: string; plan: { name: string } } },
  memberType: "EMPLOYEE" | "BENEFICIARY",
): CorporateDiscount {
  const discountCents = Math.max(0, baseCents - picked.memberPrice);
  return {
    ruleId: picked.rule.id,
    coverage: picked.rule.coverage,
    discountPercent:
      picked.rule.coverage === "DISCOUNT"
        ? picked.rule.discountPercent
        : Math.round((discountCents / baseCents) * 100),
    copayCents: picked.rule.coverage === "COPAY" ? picked.memberPrice : null,
    discountCents,
    companyId: membership.company.id,
    companyName: membership.company.name,
    planName: membership.company.plan.name,
    memberType,
  };
}

/**
 * Corporate benefit engine — the ONLY place coverage eligibility is decided.
 * Called from checkout pricing (inside the Order tx) and the cart/benefit
 * preview endpoints. Returns null when nothing applies. Never trusts client
 * input: membership, company status, contract window, rule matching and annual
 * limits are all resolved from the DB here.
 */
export async function resolveCorporateDiscount(input: {
  userId: string | null | undefined;
  serviceId: string;
  serviceKind: ServiceKind;
  baseCents: number;
  /** The currency `baseCents` is in. Omitted = assume it matches the plan's;
   *  supply it wherever it is known, or a EUR co-pay can price a CZK line. */
  currencyCode?: string | null;
}): Promise<CorporateDiscount | null> {
  if (!input.userId || input.baseCents <= 0) return null;
  // Same kinds the batch (checkout) resolver covers. Without this, a rule on
  // another ServiceKind would show a discount in the benefit picker that
  // checkout then refuses to apply.
  if (input.serviceKind !== "GENERAL" && input.serviceKind !== "SPECIALIST") return null;
  const membership = await getActiveMembershipForUser(input.userId);
  if (!membership) return null;

  const rules: RuleRow[] = await prisma.corporateBenefitRule.findMany({
    where: { corporatePlanId: membership.company.planId, isActive: true },
    select: RULE_SELECT,
  });
  if (rules.length === 0) return null;

  const used = await loadUsage(
    input.userId,
    rules,
    contractYearStart(membership.company.contractStartAt),
  );
  const picked = pickRule(rules, {
    serviceId: input.serviceId,
    serviceKind: input.serviceKind,
    baseCents: input.baseCents,
    memberType: membership.memberType,
    copayUsable: copayApplies(membership.company.plan.currencyCode, input.currencyCode),
    exhausted: makeExhaustedTest(rules, used, new Map()),
  });
  if (!picked) return null;

  const discount = toDiscount(picked, input.baseCents, membership, membership.memberType);
  return discount.discountCents > 0 ? discount : null;
}

/**
 * Batch sibling for checkout: resolve coverage for many order lines with one
 * membership + one rules query. `client` lets the checkout tx read through its
 * own transaction handle.
 */
export async function resolveCorporateDiscountsForItems(
  client: {
    service: {
      findMany: (
        args: never,
      ) => Promise<{ id: string; kind: ServiceKind; currencyCode: string | null }[]>;
    };
  },
  input: {
    userId: string | null | undefined;
    items: { id: string; serviceId: string | null; kind: string; baseCents: number }[];
  },
): Promise<Map<string, CorporateDiscount>> {
  const out = new Map<string, CorporateDiscount>();
  if (!input.userId) return out;
  const consultationItems = input.items.filter(
    (i) =>
      (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") &&
      i.serviceId &&
      i.baseCents > 0,
  );
  if (consultationItems.length === 0) return out;

  const membership = await getActiveMembershipForUser(input.userId);
  if (!membership) return out;
  const rules: RuleRow[] = await prisma.corporateBenefitRule.findMany({
    where: { corporatePlanId: membership.company.planId, isActive: true },
    select: RULE_SELECT,
  });
  if (rules.length === 0) return out;

  const serviceIds = Array.from(new Set(consultationItems.map((i) => i.serviceId as string)));
  const services = await client.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, kind: true, currencyCode: true },
  } as never);
  const kindById = new Map(services.map((s) => [s.id, s.kind]));
  const currencyById = new Map(services.map((s) => [s.id, s.currencyCode]));

  const used = await loadUsage(
    input.userId,
    rules,
    contractYearStart(membership.company.contractStartAt),
  );
  // Uses this cart is about to take, so two capped lines in one order cannot
  // both spend the last one.
  // ponytail: one use per line, while history counts `quantity`. A consultation
  // line is quantity 1 in every flow that reaches here; make it symmetric if a
  // multi-quantity consultation ever becomes possible.
  const pending = new Map<string, number>();
  const exhausted = makeExhaustedTest(rules, used, pending);

  for (const item of consultationItems) {
    const serviceKind = kindById.get(item.serviceId as string);
    if (!serviceKind) continue;
    const picked = pickRule(rules, {
      serviceId: item.serviceId as string,
      serviceKind,
      baseCents: item.baseCents,
      memberType: membership.memberType,
      copayUsable: copayApplies(
        membership.company.plan.currencyCode,
        currencyById.get(item.serviceId as string),
      ),
      exhausted,
    });
    if (!picked) continue;
    const discount = toDiscount(picked, item.baseCents, membership, membership.memberType);
    if (discount.discountCents <= 0) continue;
    if (picked.rule.annualLimit != null) {
      const key = limitKey(picked.rule);
      pending.set(key, (pending.get(key) ?? 0) + 1);
    }
    out.set(item.id, discount);
  }
  return out;
}

/** What a member's plan gives them, resolved for their company's country.
 *  Purely for display on /account/corporate — the authoritative coverage is
 *  still `resolveCorporateDiscount` at pricing time. */
export type MemberBenefits = {
  discounts: {
    label: string;
    coverage: CorporateCoverage;
    /** Percentage for DISCOUNT rows; 100 for INCLUDED. Meaningless for COPAY
     *  (the saving depends on the service price) — read `copayCents` there. */
    discountPercent: number;
    copayCents: number | null;
    /** Currency `copayCents` is denominated in — the PLAN's, not the country's.
     *  Null unless there is a co-pay to denominate. */
    copayCurrencyCode: string | null;
    /** Covered uses per contract year, null = unlimited. */
    annualLimit: number | null;
    /** Set for a kind rule, null for a rule pinned to one service. `label` is
     *  an English fallback for the kind case — the portal renders its own
     *  localized wording off this field, because a ServiceKind has no
     *  translated name anywhere in the data model. */
    serviceKind: "GENERAL" | "SPECIALIST" | null;
  }[];
  includedServices: {
    id: string;
    name: string;
    description: string | null;
    role: string;
    durationMinutes: number;
    doctorId: string;
  }[];
  /** Every public service the member's rules actually cover, with the price
   *  they would pay. Priced by the same helpers checkout uses, so the "you pay"
   *  figure is not an approximation of it. */
  discountedServices: {
    slug: string;
    name: string;
    kind: string;
    coverage: CorporateCoverage;
    discountPercent: number;
    basePriceCents: number;
    memberPriceCents: number;
    currencyCode: string | null;
    bookPath: string;
  }[];
};

const SERVICE_KIND_LABEL: Record<string, string> = {
  GENERAL: "GP consultations",
  SPECIALIST: "Specialist consultations",
};

/**
 * Plan benefit rules (coverage of the public catalogue) + the plan's own free
 * corporate consultations. Coverage labels still resolve against the company
 * country's Service rows, because that is what checkout prices; the
 * consultations are plan-owned rows with no catalogue involvement.
 * Rules on kinds checkout does not cover are dropped rather than advertised
 * — see the GENERAL/SPECIALIST guard in `resolveCorporateDiscount`.
 *
 * Annual limits are shown but NOT decremented here: this is the plan's
 * entitlement, not the member's remaining balance. A "3 of 5 left" readout
 * would need the same per-member count pricing does.
 */
export async function resolveMemberBenefits(input: {
  planId: string;
  /** The plan's currency. Co-pays are fixed amounts in it — a bare number with
   *  no currency is the one thing a member must not be shown. */
  currencyCode?: string;
  countryCode: string;
  locale: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
  /**
   * Whether this member's coverage actually applies at checkout right now —
   * i.e. `getActiveMembershipForUser` resolves for them. False during
   * onboarding and while suspended.
   *
   * Only the concrete `discountedServices` figures are gated on it. A
   * mid-onboarding member seeing "you pay €45" next to a Book link that then
   * charges €50 is the one thing this list must never do; the percentage
   * summary above it stays, because the page frames it as what completing
   * onboarding unlocks.
   */
  discountsActive: boolean;
}): Promise<MemberBenefits> {
  const countryCode = input.countryCode.toLowerCase();
  const [rules, planServices] = await Promise.all([
    prisma.corporateBenefitRule.findMany({
      where: { corporatePlanId: input.planId, isActive: true },
      select: { ...RULE_SELECT, service: { select: { slug: true, kind: true } } },
    }),
    prisma.corporatePlanService.findMany({
      where: {
        corporatePlanId: input.planId,
        isActive: true,
        OR: [{ countryCode: null }, { countryCode }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        role: true,
        durationMinutes: true,
        doctorId: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const pinnedSlugs = Array.from(
    new Set(rules.flatMap((r) => (r.service ? [r.service.slug] : []))),
  );
  const localRows = pinnedSlugs.length
    ? await prisma.service.findMany({
        where: {
          slug: { in: pinnedSlugs },
          isActive: true,
          visibility: "PUBLIC",
          country: { code: countryCode },
        },
        select: { slug: true, name: true },
      })
    : [];
  const bySlug = new Map(localRows.map((s) => [s.slug, s]));

  // A rule that can never price anything (0% discount, co-pay with no amount)
  // is dropped rather than advertised as a benefit.
  const applicableRules = rules
    .filter((r) => r.coverage !== "DISCOUNT" || r.discountPercent > 0)
    .filter((r) => r.coverage !== "COPAY" || r.copayCents != null)
    .filter((r) => input.memberType !== "BENEFICIARY" || r.appliesToBeneficiaries);

  const discounts = applicableRules.flatMap((r) => {
    const kind = r.service?.kind ?? r.serviceKind;
    if (kind !== "GENERAL" && kind !== "SPECIALIST") return [];
    const label = r.service
      ? (bySlug.get(r.service.slug)?.name ?? r.service.slug)
      : SERVICE_KIND_LABEL[kind];
    return [
      {
        label,
        coverage: r.coverage,
        discountPercent: r.coverage === "INCLUDED" ? 100 : r.discountPercent,
        copayCents: r.coverage === "COPAY" ? r.copayCents : null,
        copayCurrencyCode: r.coverage === "COPAY" ? (input.currencyCode ?? null) : null,
        annualLimit: r.annualLimit,
        serviceKind: r.service ? null : (kind as "GENERAL" | "SPECIALIST"),
      },
    ];
  });

  return {
    discounts,
    includedServices: planServices,
    discountedServices: input.discountsActive
      ? await resolveDiscountedServices(
          applicableRules,
          input.memberType,
          countryCode,
          input.locale,
          input.currencyCode,
        )
      : [],
  };
}

/**
 * The member's rules applied across the country's public catalogue, so the
 * portal can show a real "you pay" figure per service instead of a bare
 * percentage. Matching goes through the same `pickRule` checkout uses — a list
 * that disagreed with checkout would be worse than no list.
 *
 * Annual limits are NOT applied: this is the catalogue price under the plan,
 * and a member who has spent their 5 physio visits still needs to see what the
 * benefit is. Checkout is where the cap bites.
 */
async function resolveDiscountedServices(
  rules: RuleRow[],
  memberType: "EMPLOYEE" | "BENEFICIARY",
  countryCode: string,
  locale: string,
  planCurrencyCode?: string,
): Promise<MemberBenefits["discountedServices"]> {
  if (rules.length === 0) return [];
  const kinds = Array.from(
    new Set(
      rules.flatMap((r) =>
        r.serviceKind === "GENERAL" || r.serviceKind === "SPECIALIST" ? [r.serviceKind] : [],
      ),
    ),
  );
  const pinnedIds = rules.flatMap((r) => (r.serviceId ? [r.serviceId] : []));
  if (kinds.length === 0 && pinnedIds.length === 0) return [];

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      visibility: "PUBLIC",
      country: { code: countryCode },
      basePriceCents: { gt: 0 },
      OR: [
        ...(kinds.length ? [{ kind: { in: kinds as ("GENERAL" | "SPECIALIST")[] } }] : []),
        ...(pinnedIds.length ? [{ id: { in: pinnedIds } }] : []),
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      basePriceCents: true,
      currencyCode: true,
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return services.flatMap((service) => {
    // A price-less service has nothing to cover, so it would only add a
    // "0% off" row. The query already filters these out; the guard is what
    // makes that non-null for the arithmetic below.
    if (service.basePriceCents == null) return [];
    const basePriceCents = service.basePriceCents;
    const picked = pickRule(rules, {
      serviceId: service.id,
      serviceKind: service.kind as ServiceKind,
      baseCents: basePriceCents,
      memberType,
      copayUsable: copayApplies(planCurrencyCode, service.currencyCode),
    });
    if (!picked) return [];
    const discountCents = basePriceCents - picked.memberPrice;
    if (discountCents <= 0) return [];
    return [
      {
        slug: service.slug,
        name: service.name,
        kind: service.kind as string,
        coverage: picked.rule.coverage,
        discountPercent:
          picked.rule.coverage === "DISCOUNT"
            ? picked.rule.discountPercent
            : Math.round((discountCents / basePriceCents) * 100),
        basePriceCents,
        memberPriceCents: picked.memberPrice,
        currencyCode: service.currencyCode,
        bookPath: `/${countryCode}/${locale.toLowerCase()}/book?service=${service.slug}`,
      },
    ];
  });
}

export type CorporateBookabilityResult =
  | { ok: true; requestId?: string; employeeId?: string }
  | {
      ok: false;
      message: string;
      /** True only when the requester actually belongs to some corporate company.
       *  Callers answer 403 + `message` for those people (they need to know WHY
       *  their own benefit was refused) and a bare 404 for everyone else, so a
       *  corporate consultation is not an existence oracle for any logged-in
       *  patient — only for the members it already exists for. */
      isMember: boolean;
    };

/** Any non-removed corporate membership for this user, employee or beneficiary.
 *  Only consulted on the refusal path, so it costs nothing in the happy case. */
async function holdsCorporateMembership(userId: string): Promise<boolean> {
  const [employee, beneficiary] = await Promise.all([
    prisma.corporateEmployee.count({ where: { userId, status: { not: "REMOVED" } } }),
    prisma.corporateBeneficiary.count({ where: { userId, status: { not: "REMOVED" } } }),
  ]);
  return employee + beneficiary > 0;
}

/**
 * Server-side gate for booking a CorporatePlanService from the member portal.
 * Corporate consultations are not Service rows and are never reachable from
 * the storefront, so this is the ONLY booking path they have.
 *
 * PRE_ASSESSMENT: requester must be a not-yet-active employee of a live
 * company; when the company pins a pre-assessment doctor, that pin wins over
 * the plan's assigned doctor.
 *
 * ILLNESS_BENEFIT / FIT_FOR_WORK: an open CorporateServiceRequest for this
 * consultation is consumed when one exists; the booking is not blocked when
 * none does (these consultations are free and unlimited for members).
 *
 * INCLUDED: any active member of the plan.
 *
 * Annual limits live on CorporateBenefitRule and cap coverage of PRICED
 * CATALOGUE services at checkout. They do not apply here: a CorporatePlanService
 * carries no price, no order line and therefore nothing to count.
 */
export async function assertCorporateServiceBookable(input: {
  userId: string | null | undefined;
  corporateServiceId: string;
  isAdmin?: boolean;
}): Promise<CorporateBookabilityResult> {
  if (input.isAdmin) return { ok: true };
  if (!input.userId) {
    return { ok: false, message: "Sign in to book this consultation", isMember: false };
  }
  const userId = input.userId;

  const corporateService = await prisma.corporatePlanService.findFirst({
    where: { id: input.corporateServiceId, isActive: true },
    select: { id: true, corporatePlanId: true, countryCode: true, role: true },
  });
  if (!corporateService) {
    return { ok: false, message: "Consultation not found", isMember: false };
  }

  const notEligible = async (message: string) => ({
    ok: false as const,
    message,
    isMember: await holdsCorporateMembership(userId),
  });
  const companyScope = {
    planId: corporateService.corporatePlanId,
    ...(corporateService.countryCode ? { countryCode: corporateService.countryCode } : {}),
  };

  if (corporateService.role === "PRE_ASSESSMENT") {
    // Onboarding-only: the employee is mid-onboarding, so no ACTIVE membership
    // exists yet and `getActiveMembershipForUser` cannot answer for them.
    const employee = await prisma.corporateEmployee.findFirst({
      where: {
        userId,
        status: { in: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"] },
        company: companyScope,
      },
      include: { company: true },
    });
    if (!employee || !companyIsLive(employee.company)) {
      return notEligible("This consultation is only available during corporate onboarding");
    }
    return { ok: true, employeeId: employee.id };
  }

  // `getActiveMembershipForUser` already rejects non-live companies.
  const membership = await getActiveMembershipForUser(userId);
  if (!membership) {
    return notEligible("This consultation is only available to active corporate members");
  }
  if (membership.company.planId !== corporateService.corporatePlanId) {
    return notEligible("This consultation is not part of your company's plan");
  }
  if (
    corporateService.countryCode &&
    corporateService.countryCode !== membership.company.countryCode
  ) {
    return notEligible("This consultation is not offered in your company's country");
  }

  // Consume an open company request when there is one. Its absence is not a
  // refusal — these consultations carry no usage limit.
  const request = await prisma.corporateServiceRequest.findFirst({
    where: {
      corporateServiceId: corporateService.id,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] },
      employee: { userId, status: { notIn: ["REMOVED", "SUSPENDED"] } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, employeeId: true },
  });
  return {
    ok: true,
    ...(request ? { requestId: request.id, employeeId: request.employeeId } : {}),
  };
}
