import type { LocaleCode, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { resolveCorporateDiscountForCard } from "../corporate/corporate-benefit.service.js";
import { getActiveMembershipByCardNumber } from "../corporate/corporate-shared.js";
import {
  pricingEnrollmentSelect,
  priceMembershipLine,
} from "../memberships/membership-pricing.service.js";
import type { PricingEnrollment } from "../memberships/membership-pricing.service.js";
import { loadValidatedInsurancePrice } from "../pricing/insurance-pricing.service.js";

/**
 * Self-declared coverage — the booking form's coverage picker.
 *
 * `benefit-options.service` answers "what does this ACCOUNT already hold?".
 * This answers the other half: "the patient says they hold something, here is
 * the catalogue of what an admin has configured, and here is what it prices to
 * if their card checks out." Two distinct questions, deliberately two modules:
 * the options service may only ever price verified, account-linked benefits,
 * and mixing an unverified declaration into it would let a typed card number
 * change a price with nobody having looked at it.
 *
 * Nothing here is trusted. A declared line is parked in
 * `Order.insuranceVerificationStatus = PENDING` at checkout (the historical
 * column name — it is now the gate for every manually verified coverage), with
 * the slot reserved and no payment taken. An admin verifies the card and the
 * patient is charged the coverage price; a rejection re-prices to standard.
 * So the worst a forged declaration achieves is a booking a human then refuses.
 *
 * The one exception is a card that already resolves to the booking account —
 * see `declaredCoverageIsAccountLinked`, which checkout consults to skip a
 * review that would decide nothing.
 */

export type DeclaredCoverageSource = "INSURANCE" | "CORPORATE" | "MEMBERSHIP" | "PUBLIC_PLAN";

/** One admin-configured provider the patient can pick inside a category. */
export type CoverageProvider = {
  id: string;
  name: string;
};

export type CoverageCatalog = {
  insurance: CoverageProvider[];
  corporate: CoverageProvider[];
  membership: CoverageProvider[];
  publicPlan: CoverageProvider[];
};

function translated(
  translations: { locale: LocaleCode; name: string }[],
  locale: LocaleCode | null | undefined,
  fallback: string,
): string {
  if (!locale) return fallback;
  return translations.find((t) => t.locale === locale)?.name ?? fallback;
}

function byName(a: CoverageProvider, b: CoverageProvider): number {
  return a.name.localeCompare(b.name);
}

/**
 * Everything an admin has configured for one market, grouped by category.
 *
 * Insurance is filtered to companies that actually cover `serviceId` when one is
 * supplied — an insurer with no coverage row for the service is not selectable,
 * and offering it would produce a hard 400 at add-to-cart. The other three
 * categories are country-scoped only: whether the patient's specific card earns
 * anything on this service is decided at `resolveDeclaredCoverage` time, where
 * the answer can name the reason.
 */
export async function listCoverageCatalog(args: {
  countryCode: string;
  serviceId?: string | null;
  locale?: LocaleCode | null;
}): Promise<CoverageCatalog | null> {
  const code = args.countryCode.trim().toLowerCase();
  if (!code) return null;
  const country = await prisma.country.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!country) return null;
  const locale = args.locale ?? null;

  const [insurers, companies, membershipPlans, pricingPlans] = await Promise.all([
    prisma.insuranceCompany.findMany({
      where: {
        countryId: country.id,
        isActive: true,
        ...(args.serviceId ? { coverages: { some: { serviceId: args.serviceId } } } : {}),
      },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.corporateCompany.findMany({
      where: {
        countryCode: code,
        status: "ACTIVE",
        contractStartAt: { lte: new Date() },
        OR: [{ contractEndAt: null }, { contractEndAt: { gt: new Date() } }],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.membershipPlan.findMany({
      where: { isActive: true, countries: { some: { countryId: country.id } } },
      select: {
        id: true,
        name: true,
        translations: { select: { locale: true, name: true } },
      },
    }),
    prisma.pricingPlan.findMany({
      where: { countryId: country.id, isActive: true },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        translations: { select: { locale: true, name: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    insurance: insurers,
    corporate: companies,
    membership: membershipPlans
      .map((p) => ({ id: p.id, name: translated(p.translations, locale, p.name) }))
      .sort(byName),
    // Display order is the admin's deliberate tier ordering (Essential →
    // Premium), so it is kept rather than re-sorted alphabetically.
    publicPlan: pricingPlans.map((p) => ({
      id: p.id,
      name: translated(p.translations, locale, p.name),
    })),
  };
}

/**
 * Can the system settle this declaration by itself, with no human in the loop?
 *
 * Yes wherever WE are the authority on the card. A membership id and a
 * corporate card number are credentials this platform issued — 8 crypto-random
 * base32 chars (decision 40) and `randomBytes(10)` respectively — so they are
 * unguessable bearer tokens, and resolving one to a live record answers the
 * only question a reviewer could have asked. Sending those to a queue would be
 * asking staff to re-do a lookup the database already did, on every booking.
 *
 * No in exactly three cases, each because the check is genuinely impossible
 * rather than merely inconvenient:
 *
 *   - INSURANCE. The policy lives in the insurer's system; we hold no copy to
 *     check against. This is the case the manual queue was built for, and it
 *     stays manual until the insurer integrations land.
 *   - MEMBERSHIP matched only on `partnerReference`. That is the partner's own
 *     member number — often sequential, and explicitly permitted to repeat
 *     across plans — so it is a label, not a credential. §5.3 avoids leaking
 *     whether one exists for the same reason; auto-approving on one would hand
 *     out member pricing to anyone who counts upwards.
 *   - PUBLIC_PLAN where the session does not hold the plan. A plan "card
 *     number" is not a key for anything: the real entitlement is a
 *     per-subscription credit balance owned by an account.
 */
export async function declaredCoverageIsSystemVerified(args: {
  userId: string | null | undefined;
  source: DeclaredCoverageSource;
  refId: string;
  cardNumber: string;
}): Promise<boolean> {
  const card = args.cardNumber.trim();
  const refId = args.refId.trim();
  if (!card || !refId) return false;

  if (args.source === "MEMBERSHIP") {
    // `membershipId` ONLY — deliberately not the partnerReference fallback the
    // pricing path accepts. Pricing may be generous here because a human still
    // sees the booking; skipping that human may not.
    const enrollment = await prisma.membershipEnrollment.findFirst({
      where: {
        planId: refId,
        status: { in: ["ACTIVE", "PENDING"] },
        membershipId: { equals: card, mode: "insensitive" },
      },
      select: { id: true },
    });
    return enrollment !== null;
  }

  if (args.source === "CORPORATE") {
    // Already enforces card status + validity window, member status, and that
    // the company's contract is live.
    const membership = await getActiveMembershipByCardNumber(card);
    return membership !== null && membership.company.id === refId;
  }

  if (args.source === "PUBLIC_PLAN") {
    if (!args.userId) return false;
    const subscription = await prisma.userSubscription.findFirst({
      where: { userId: args.userId, planId: refId, status: "ACTIVE" },
      select: { id: true },
    });
    return subscription !== null;
  }

  return false;
}

export type DeclaredCoverageResult =
  | {
      ok: true;
      source: DeclaredCoverageSource;
      refId: string;
      /** Provider name as shown to the patient, for the summary + admin queue. */
      label: string;
      /** What the line costs if the card verifies. Never above the full price. */
      unitPriceCents: number;
    }
  | {
      ok: false;
      /**
       * Why the declaration cannot be priced. Each maps to its own patient-facing
       * sentence — "we could not find that card" and "your plan does not cover
       * this service" are different problems with different fixes.
       */
      reason:
        | "UNKNOWN_PROVIDER"
        | "CARD_NOT_RECOGNISED"
        | "NO_BENEFIT_FOR_SERVICE"
        | "ACCOUNT_LINK_REQUIRED";
    };

type DeclaredCoverageInput = {
  source: DeclaredCoverageSource;
  /** InsuranceCompany / CorporateCompany / MembershipPlan / PricingPlan id. */
  refId: string;
  cardNumber: string;
  service: {
    id: string;
    countryId: string;
    kind: ServiceKind;
    currencyCode?: string | null;
  };
  /** Peak-adjusted price for the slot — what the patient pays without coverage. */
  fullPriceCents: number;
  locale?: LocaleCode | null;
};

/**
 * Price one declared coverage, or say why it cannot be priced.
 *
 * The price is only ever a proposal: checkout parks the order and an admin
 * verifies the card before a cent moves. Which is also why the membership path
 * below prices a PENDING (imported, not-yet-claimed) enrollment as if it were
 * active — that row is a real member who simply has not clicked the claim link,
 * and the verification step is precisely where a human confirms that. SUSPENDED,
 * EXPIRED and REMOVED stay refused: those are decisions already taken.
 */
export async function resolveDeclaredCoverage(
  input: DeclaredCoverageInput,
): Promise<DeclaredCoverageResult> {
  const card = input.cardNumber.trim();
  const refId = input.refId.trim();
  if (!refId || !card) return { ok: false, reason: "CARD_NOT_RECOGNISED" };

  switch (input.source) {
    case "INSURANCE":
      return resolveInsurance(input, refId);
    case "CORPORATE":
      return resolveCorporate(input, refId, card);
    case "MEMBERSHIP":
      return resolveMembership(input, refId, card);
    case "PUBLIC_PLAN":
      return resolvePublicPlan(input, refId);
    default:
      return { ok: false, reason: "UNKNOWN_PROVIDER" };
  }
}

async function resolveInsurance(
  input: DeclaredCoverageInput,
  refId: string,
): Promise<DeclaredCoverageResult> {
  const company = await prisma.insuranceCompany.findFirst({
    where: { id: refId, isActive: true, countryId: input.service.countryId },
    select: { id: true, name: true },
  });
  if (!company) return { ok: false, reason: "UNKNOWN_PROVIDER" };
  // The insurer's negotiated price for this service. Policy numbers are issued
  // by the insurer, so there is nothing here to look the card up against — the
  // card IS the thing a human verifies.
  const price = await loadValidatedInsurancePrice(input.service.id, company.id);
  if (price == null) return { ok: false, reason: "NO_BENEFIT_FOR_SERVICE" };
  return {
    ok: true,
    source: "INSURANCE",
    refId: company.id,
    label: company.name,
    unitPriceCents: Math.min(price, input.fullPriceCents),
  };
}

async function resolveCorporate(
  input: DeclaredCoverageInput,
  refId: string,
  card: string,
): Promise<DeclaredCoverageResult> {
  const company = await prisma.corporateCompany.findFirst({
    where: { id: refId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!company) return { ok: false, reason: "UNKNOWN_PROVIDER" };

  const discount = await resolveCorporateDiscountForCard({
    cardNumber: card,
    companyId: company.id,
    serviceId: input.service.id,
    serviceKind: input.service.kind,
    baseCents: input.fullPriceCents,
    currencyCode: input.service.currencyCode ?? null,
  });
  // The card either did not resolve to a live member of THIS company, or it did
  // and the plan simply covers nothing here. Only the second is worth a
  // "your plan doesn't cover this" — so re-check the lookup to tell them apart.
  if (!discount) {
    const member = await prisma.corporateBenefitCard.findFirst({
      where: {
        cardNumber: { equals: card, mode: "insensitive" },
        status: "ACTIVE",
        validUntil: { gt: new Date() },
        OR: [{ employee: { companyId: company.id } }, { beneficiary: { companyId: company.id } }],
      },
      select: { id: true },
    });
    return { ok: false, reason: member ? "NO_BENEFIT_FOR_SERVICE" : "CARD_NOT_RECOGNISED" };
  }

  return {
    ok: true,
    source: "CORPORATE",
    refId: company.id,
    label: company.name,
    unitPriceCents: Math.max(0, input.fullPriceCents - discount.discountCents),
  };
}

async function resolveMembership(
  input: DeclaredCoverageInput,
  refId: string,
  card: string,
): Promise<DeclaredCoverageResult> {
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: refId, isActive: true },
    select: {
      id: true,
      name: true,
      translations: { select: { locale: true, name: true } },
    },
  });
  if (!plan) return { ok: false, reason: "UNKNOWN_PROVIDER" };
  const label = translated(plan.translations, input.locale ?? null, plan.name);

  // The card is either the generated membership id or the partner's own member
  // number — members are handed whichever their programme prints, and asking
  // them which kind it is would be asking them to know our data model.
  const enrollment = await prisma.membershipEnrollment.findFirst({
    where: {
      planId: plan.id,
      status: { in: ["ACTIVE", "PENDING"] },
      OR: [
        { membershipId: { equals: card, mode: "insensitive" } },
        { partnerReference: { equals: card, mode: "insensitive" } },
      ],
    },
    select: pricingEnrollmentSelect,
  });
  if (!enrollment) return { ok: false, reason: "CARD_NOT_RECOGNISED" };

  // See the doc comment: an imported-but-unclaimed row is a real member, and
  // the manual verification step is where a human says so. Nothing else about
  // the enrollment is relaxed — term dates and level benefits still govern.
  const priced = await priceMembershipLine({
    enrollment: { ...enrollment, status: "ACTIVE" } as PricingEnrollment,
    service: {
      id: input.service.id,
      countryId: input.service.countryId,
      kind: input.service.kind,
    },
    fullPriceCents: input.fullPriceCents,
  });
  if (!priced) return { ok: false, reason: "NO_BENEFIT_FOR_SERVICE" };

  return {
    ok: true,
    source: "MEMBERSHIP",
    refId: plan.id,
    label,
    unitPriceCents: priced.unitPriceCents,
  };
}

async function resolvePublicPlan(
  input: DeclaredCoverageInput,
  refId: string,
): Promise<DeclaredCoverageResult> {
  const plan = await prisma.pricingPlan.findFirst({
    where: { id: refId, isActive: true, countryId: input.service.countryId },
    select: {
      id: true,
      name: true,
      translations: { select: { locale: true, name: true } },
      consultationRules: {
        where: { serviceId: input.service.id, isActive: true },
        select: {
          isIncluded: true,
          usesCredits: true,
          discountMode: true,
          discountPercent: true,
          fixedPriceCents: true,
        },
      },
    },
  });
  if (!plan) return { ok: false, reason: "UNKNOWN_PROVIDER" };
  const label = translated(plan.translations, input.locale ?? null, plan.name);

  const rule = plan.consultationRules[0];
  if (!rule) return { ok: false, reason: "NO_BENEFIT_FOR_SERVICE" };

  if (rule.isIncluded) {
    return { ok: true, source: "PUBLIC_PLAN", refId: plan.id, label, unitPriceCents: 0 };
  }

  // Credits are a per-subscription balance, and a declared plan has no
  // subscription to read one from. A signed-in subscriber never lands here —
  // the account-linked benefit picker already prices their credit exactly — so
  // the honest answer is "sign in / link the plan", not a €0 we cannot back.
  const price = planRulePrice(rule, input.fullPriceCents);
  if (price == null) {
    return { ok: false, reason: rule.usesCredits ? "ACCOUNT_LINK_REQUIRED" : "NO_BENEFIT_FOR_SERVICE" };
  }

  return {
    ok: true,
    source: "PUBLIC_PLAN",
    refId: plan.id,
    label,
    unitPriceCents: Math.min(Math.max(0, Math.round(price)), input.fullPriceCents),
  };
}

/** The discount half of a plan's consultation rule, or null when it has none. */
function planRulePrice(
  rule: {
    discountMode: "NONE" | "PERCENT" | "FIXED";
    discountPercent: number | null;
    fixedPriceCents: number | null;
  },
  fullPriceCents: number,
): number | null {
  if (rule.discountMode === "PERCENT") {
    const pct = rule.discountPercent;
    if (pct == null || pct <= 0) return null;
    return fullPriceCents - (fullPriceCents * Math.min(pct, 100)) / 100;
  }
  if (rule.discountMode === "FIXED") {
    return rule.fixedPriceCents == null ? null : rule.fixedPriceCents;
  }
  return null;
}
