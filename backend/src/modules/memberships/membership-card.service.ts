import type { LocaleCode, MembershipEnrollmentStatus, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { deriveCardPalette, type CardPalette } from "../../lib/card-colour.js";
import { countryDisplayName } from "./membership-card-content.js";

/**
 * Member-facing read model for the membership page and the digital card
 * (§10). Everything here is scoped to one account: the caller passes the
 * session user id and gets back only rows whose `userId` is that account, or
 * dependents of those rows.
 *
 * There is no card table — the card is these same fields, rendered. And there
 * is no public verification URL (§20): `verifyMembershipForStaff` is the only
 * lookup by membership id, and it sits behind an admin session.
 */

/**
 * Where "now" sits relative to the term. `status` alone cannot say this: a row
 * with a future `startDate` links as ACTIVE and stays ACTIVE (EXPIRED is
 * terminal, §5.2) while granting nothing until the term opens. The member page
 * shows "starts on <date>" for that window.
 */
export type MembershipTermState = "NOT_STARTED" | "IN_TERM" | "ENDED";

export type MemberBenefitView = {
  id: string;
  /**
   * WHICH covered country this row configures (§21.3). Flat before phase 7,
   * when a level had exactly one country; since 7a the rows span every covered
   * country, and without this the member page would list an Irish discount and
   * a Czech one under one undifferentiated heading.
   */
  countryCode: string;
  /** Localised via `Intl` — there is no `CountryTranslation` model (§25). */
  countryName: string;
  /**
   * Exactly one of `serviceKind` / `serviceName` is set, mirroring the benefit
   * row's own invariant. Typed as the full `ServiceKind` rather than
   * `GENERAL | SPECIALIST`: the column really is the wide enum, and the
   * GENERAL/SPECIALIST restriction (§18) is enforced by the write validation
   * and a CHECK constraint, not by the type. Narrowing here would make the
   * read model claim a guarantee it does not itself hold.
   */
  serviceKind: ServiceKind | null;
  serviceName: string | null;
  benefitType: "ALLOWANCE" | "PERCENT" | "FIXED" | "EXCLUDED";
  percentOff: number | null;
  fixedPriceCents: number | null;
  currencyCode: string | null;
  fallbackType: "NONE" | "PERCENT" | "FIXED";
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  /** ALLOWANCE rows only. */
  allowance: { allocated: number; used: number; remaining: number } | null;
};

export type MemberDependentView = {
  id: string;
  firstName: string;
  lastName: string;
  membershipId: string;
  status: MembershipEnrollmentStatus;
  relationship: string | null;
  /** Their own account has attached — until then the dependent gets nothing. */
  linked: boolean;
  /**
   * Whether the member may remove this one (§10). True only for dependents the
   * member added themselves, which is the case where neither provenance column
   * is set: an import stamps `importBatchId`, an admin add stamps
   * `createdByAdminId`. Sent from here rather than inferred client-side so the
   * UI cannot disagree with the server's own rule in
   * `removeMemberDependent`.
   */
  removableByMember: boolean;
};

export type MemberMembershipView = {
  id: string;
  membershipId: string;
  planName: string;
  levelName: string;
  status: MembershipEnrollmentStatus;
  termState: MembershipTermState;
  startDate: string;
  endDate: string | null;
  memberType: "PRIMARY" | "DEPENDENT";
  holderName: string;
  /** The plan's PRIMARY country — attribution, not where benefits apply. */
  countryCode: string;
  /**
   * Where the card actually works, primary first (§24.1). Configured
   * countries only: a covered country with no benefit rows gives nothing
   * (§20), and printing its code on the member's card would be a lie they
   * would only discover at a desk abroad.
   */
  countryCodes: string[];
  /** Derived from the level's `cardBackgroundHex`; null = the default face. */
  cardPalette: CardPalette | null;
  /** A dependent's `-D1` number resolves to this. Null on a primary. */
  primaryMembershipId: string | null;
  /**
   * DEPENDENT on a `SHARED` level (§43). Conditioned on the pool mode, not on
   * `memberType` alone: a dependent on `PER_PERSON` really does hold their own
   * units, and telling them the allowance is shared would be false.
   */
  sharesPool: boolean;
  family: { enabled: boolean; maxDependents: number; used: number } | null;
  benefits: MemberBenefitView[];
  dependents: MemberDependentView[];
};

function termState(startDate: Date, endDate: Date | null, now: Date): MembershipTermState {
  if (startDate > now) return "NOT_STARTED";
  if (endDate && endDate < now) return "ENDED";
  return "IN_TERM";
}

/**
 * The enrollment that owns an allowance pool: self under `PER_PERSON`, the
 * primary under `SHARED` (§11). Phase 5's allowance service will own the
 * spend/refund side of this; phase 3 only needs to read the right counter, so
 * the rule lives here rather than pulling a service that does not exist yet
 * into existence early. Phase 4's pricing resolver reads the same counter and
 * imports this, so the two can never disagree about whose pool applies.
 */
export function holderEnrollmentId(enrollment: {
  id: string;
  memberType: "PRIMARY" | "DEPENDENT";
  primaryEnrollmentId: string | null;
  level: { allowancePool: "SHARED" | "PER_PERSON" };
}): string {
  return enrollment.level.allowancePool === "SHARED" && enrollment.memberType === "DEPENDENT"
    ? (enrollment.primaryEnrollmentId ?? enrollment.id)
    : enrollment.id;
}

const enrollmentSelect = {
  id: true,
  membershipId: true,
  firstName: true,
  lastName: true,
  status: true,
  startDate: true,
  endDate: true,
  memberType: true,
  primaryEnrollmentId: true,
  userId: true,
  planId: true,
  levelId: true,
  primaryEnrollment: { select: { membershipId: true } },
  plan: {
    select: {
      name: true,
      primaryCountryId: true,
      // Currency lives on the related Currency row, not on Country — a
      // `currencyCode` select here type-checks and then fails at runtime.
      primaryCountry: {
        select: { code: true, defaultLocale: true, currency: { select: { code: true } } },
      },
      // Per-country currencies for the benefit rows: a FIXED price stays in
      // its own country's currency and is never converted (§22).
      countries: {
        select: {
          countryId: true,
          country: { select: { code: true, currency: { select: { code: true } } } },
        },
      },
      translations: { select: { locale: true, name: true } },
    },
  },
  level: {
    select: {
      name: true,
      familyEnabled: true,
      maxDependents: true,
      allowancePool: true,
      cardBackgroundHex: true,
      translations: { select: { locale: true, name: true } },
      benefits: {
        where: { isActive: true },
        select: {
          id: true,
          countryId: true,
          serviceKind: true,
          benefitType: true,
          allowanceCount: true,
          percentOff: true,
          fixedPriceCents: true,
          fallbackType: true,
          fallbackPercent: true,
          fallbackFixedCents: true,
          service: { select: { name: true } },
        },
      },
    },
  },
  dependents: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      membershipId: true,
      status: true,
      relationship: true,
      userId: true,
      createdByAdminId: true,
      importBatchId: true,
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

function loadEnrollments(where: { userId: string; id?: string }) {
  return prisma.membershipEnrollment.findMany({
    where: { ...where, status: { not: "REMOVED" } },
    select: enrollmentSelect,
    orderBy: { createdAt: "asc" },
  });
}

type EnrollmentRow = Awaited<ReturnType<typeof loadEnrollments>>[number];

function translated(
  translations: { locale: LocaleCode; name: string }[],
  locale: LocaleCode | null,
  fallback: string,
): string {
  if (!locale) return fallback;
  return translations.find((t) => t.locale === locale)?.name ?? fallback;
}

async function toView(
  row: EnrollmentRow,
  locale: LocaleCode | null,
  now: Date,
): Promise<MemberMembershipView> {
  const allowanceRows = row.level.benefits.filter((b) => b.benefitType === "ALLOWANCE");
  const balances = allowanceRows.length
    ? await prisma.membershipAllowanceBalance.findMany({
        where: {
          benefitId: { in: allowanceRows.map((b) => b.id) },
          holderEnrollmentId: holderEnrollmentId(row),
          // The counter is per TERM (§3.5): a renewal creates a new balance row
          // rather than resetting the old one, so an unfiltered read returns
          // several rows per benefit and the map below silently keeps whichever
          // came last. `row.startDate` is the holder's own start date — a
          // dependent inherits it from its primary (§3.4), so this is the right
          // key under SHARED too.
          termStart: row.startDate,
        },
        select: { benefitId: true, allocated: true, used: true },
      })
    : [];
  const usedByBenefit = new Map(balances.map((b) => [b.benefitId, b]));

  const countryById = new Map(
    row.plan.countries.map((c) => [
      c.countryId,
      { code: c.country.code.toUpperCase(), currency: c.country.currency?.code ?? null },
    ]),
  );

  // Primary country first, then alphabetically — the same order the card, the
  // card image and the welcome email use, so a member comparing them sees one list.
  const configuredCountryIds = [...new Set(row.level.benefits.map((b) => b.countryId))]
    .filter((id) => countryById.has(id))
    .sort((a, b) => {
      if (a === row.plan.primaryCountryId) return -1;
      if (b === row.plan.primaryCountryId) return 1;
      return (countryById.get(a)?.code ?? "").localeCompare(countryById.get(b)?.code ?? "");
    });

  return {
    id: row.id,
    membershipId: row.membershipId,
    planName: translated(row.plan.translations, locale, row.plan.name),
    levelName: translated(row.level.translations, locale, row.level.name),
    status: row.status,
    termState: termState(row.startDate, row.endDate, now),
    startDate: row.startDate.toISOString(),
    endDate: row.endDate?.toISOString() ?? null,
    memberType: row.memberType,
    holderName: `${row.firstName} ${row.lastName}`.trim(),
    countryCode: row.plan.primaryCountry.code,
    countryCodes: configuredCountryIds.map((id) => countryById.get(id)!.code),
    cardPalette: deriveCardPalette(row.level.cardBackgroundHex),
    primaryMembershipId: row.primaryEnrollment?.membershipId ?? null,
    sharesPool: row.level.allowancePool === "SHARED" && row.memberType === "DEPENDENT",
    family: row.level.familyEnabled
      ? {
          enabled: true,
          maxDependents: row.level.maxDependents,
          used: row.dependents.filter((d) => d.status !== "REMOVED").length,
        }
      : null,
    benefits: row.level.benefits.map((b) => {
      // No balance row yet just means nothing has been spent — the counter is
      // created lazily on first use (§3.5), so absent reads as zero used.
      const balance = usedByBenefit.get(b.id);
      const allocated = balance?.allocated ?? b.allowanceCount ?? 0;
      const used = balance?.used ?? 0;
      const country = countryById.get(b.countryId);
      return {
        id: b.id,
        countryCode: country?.code ?? row.plan.primaryCountry.code.toUpperCase(),
        countryName: countryDisplayName(
          country?.code ?? row.plan.primaryCountry.code,
          locale ?? row.plan.primaryCountry.defaultLocale,
        ),
        serviceKind: b.serviceKind,
        serviceName: b.service?.name ?? null,
        benefitType: b.benefitType,
        percentOff: b.percentOff,
        fixedPriceCents: b.fixedPriceCents,
        // This row's OWN country's currency, not the plan's. A FIXED price in
        // Ireland is euro and one in Czechia is koruna; showing both as the
        // primary country's currency would misquote one of them (§22).
        currencyCode: country?.currency ?? row.plan.primaryCountry.currency?.code ?? null,
        fallbackType: b.fallbackType,
        fallbackPercent: b.fallbackPercent,
        fallbackFixedCents: b.fallbackFixedCents,
        allowance:
          b.benefitType === "ALLOWANCE"
            ? { allocated, used, remaining: Math.max(0, allocated - used) }
            : null,
      };
    }),
    dependents: row.dependents
      .filter((d) => d.status !== "REMOVED")
      .map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        membershipId: d.membershipId,
        status: d.status,
        relationship: d.relationship,
        linked: d.userId !== null,
        removableByMember: d.createdByAdminId === null && d.importBatchId === null,
      })),
  };
}

/** Every membership this account holds (§19 allows several). */
export async function listMemberMemberships(
  userId: string,
  locale: LocaleCode | null,
): Promise<MemberMembershipView[]> {
  const rows = await loadEnrollments({ userId });
  const now = new Date();
  return Promise.all(rows.map((row) => toView(row, locale, now)));
}

/**
 * One membership, scoped to the caller. Returns null rather than throwing on a
 * miss so the route answers 404 identically for "does not exist" and "is not
 * yours" — a member must not be able to probe other members' enrollment ids.
 */
export async function getMemberMembership(
  userId: string,
  enrollmentId: string,
  locale: LocaleCode | null,
): Promise<MemberMembershipView | null> {
  const [row] = await loadEnrollments({ userId, id: enrollmentId });
  return row ? toView(row, locale, new Date()) : null;
}

export type StaffVerifyView = {
  found: boolean;
  membershipId: string;
  holderName: string;
  planName: string;
  levelName: string;
  status: MembershipEnrollmentStatus;
  termState: MembershipTermState;
  startDate: string;
  endDate: string | null;
  countryCode: string;
  /** What staff actually need: is this card good for a benefit right now? */
  benefitsActive: boolean;
};

/**
 * Staff card lookup (§10/§20). The one place a membership id resolves to a
 * person, and it is admin-session only — there is deliberately no public
 * verification URL, because that would turn a sequential partner id into a
 * member directory.
 */
export async function verifyMembershipForStaff(
  membershipIdInput: string,
): Promise<StaffVerifyView | null> {
  const row = await prisma.membershipEnrollment.findFirst({
    where: { membershipId: { equals: membershipIdInput.trim(), mode: "insensitive" } },
    select: {
      membershipId: true,
      firstName: true,
      lastName: true,
      status: true,
      startDate: true,
      endDate: true,
      plan: { select: { name: true, primaryCountry: { select: { code: true } } } },
      level: { select: { name: true } },
    },
  });
  if (!row) return null;

  const state = termState(row.startDate, row.endDate, new Date());
  return {
    found: true,
    membershipId: row.membershipId,
    holderName: `${row.firstName} ${row.lastName}`.trim(),
    planName: row.plan.name,
    levelName: row.level.name,
    status: row.status,
    termState: state,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate?.toISOString() ?? null,
    countryCode: row.plan.primaryCountry.code,
    // Both conditions, because either alone is misleading: an ACTIVE row whose
    // term has not opened grants nothing, and an in-term SUSPENDED row is off.
    benefitsActive: row.status === "ACTIVE" && state === "IN_TERM",
  };
}
