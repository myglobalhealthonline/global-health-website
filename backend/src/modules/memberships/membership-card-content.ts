import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { deriveCardPalette, type CardPalette } from "../../lib/card-colour.js";

/**
 * The ONE builder behind every rendering of a membership card (§24.3).
 *
 * The web card, the PDF and the welcome email body all read this. Chrome may
 * differ between renderers — that is accepted — but what the card *says* comes
 * from here, so the printed card and the emailed one cannot drift on the
 * member's ID, their covered countries, or what their benefits are.
 *
 * Everything leaves here as a pre-formatted string, per §24.1: no renderer
 * formats a date, a price or a country name, because three renderers formatting
 * independently is three chances to disagree.
 */

/** BCP-47 tags for `Intl`. Six locales, so a map rather than a lookup table. */
const LOCALE_TAG: Record<LocaleCode, string> = {
  EN: "en-IE",
  PT: "pt-PT",
  ES: "es-ES",
  CS: "cs-CZ",
  RO: "ro-RO",
  DE: "de-DE",
};

export function localeTag(locale: LocaleCode): string {
  return LOCALE_TAG[locale] ?? LOCALE_TAG.EN;
}

/**
 * Country headings in the member's own language. There is no
 * `CountryTranslation` model — `Country.name` is one English string — and
 * `Intl` already knows every region name in all six locales (§25).
 */
export function countryDisplayName(code: string, locale: LocaleCode): string {
  const upper = code.toUpperCase();
  try {
    // `fallback: "code"` so an unmapped-but-well-formed code comes back as the
    // code. A malformed one throws instead, hence the catch — a country
    // heading must degrade to something printable rather than take down a send.
    return (
      new Intl.DisplayNames([localeTag(locale)], { type: "region", fallback: "code" }).of(upper) ??
      upper
    );
  } catch {
    return upper;
  }
}

export type CardBenefitLine = {
  /** Already-localised sentence. Renderers print it, they do not build it. */
  text: string;
  /** ALLOWANCE rows on a shared pool, for the §43 wording check in tests. */
  sharedPool: boolean;
};

export type CardCountryBenefits = {
  countryCode: string;
  countryName: string;
  lines: CardBenefitLine[];
};

export type MembershipCardContent = {
  enrollmentId: string;
  membershipId: string;
  holderName: string;
  /** The address the partner enrolled. */
  email: string;
  /**
   * The linked account's address, once one exists. Preferred over `email` when
   * sending: it is the mailbox that has actually been verified (§5.2), and
   * `linkMembershipsForUser` matches case-insensitively, so the two can differ
   * in case or not at all.
   */
  accountEmail: string | null;
  firstName: string;
  planName: string;
  levelName: string;
  status: string;
  /** "Valid through 08 / 2027", "Open-ended", "From 01 / 2027" — localised. */
  validThrough: string;
  /**
   * ISO-2 codes of the countries this card actually WORKS in, primary first
   * (§24.1). Deliberately the CONFIGURED countries, not every covered one: a
   * covered country with no benefit rows gives no benefit at all (§20), and
   * printing its code on a card the member shows at a desk would be a
   * member-facing lie with a PDF's shelf life.
   */
  countryCodes: string[];
  memberType: "PRIMARY" | "DEPENDENT";
  /** DEPENDENT on a SHARED level — drives the §43 wording. */
  sharesPool: boolean;
  /** The primary's membership ID, so a `-D1` card can show the family link. */
  primaryMembershipId: string | null;
  /** Null = keep the default face and its fixed lime chrome (§24.2). */
  palette: CardPalette | null;
  benefitsByCountry: CardCountryBenefits[];
  locale: LocaleCode;
};

const contentSelect = {
  id: true,
  membershipId: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  startDate: true,
  endDate: true,
  memberType: true,
  preferredLocale: true,
  cardIssuedAt: true,
  primaryEnrollment: { select: { membershipId: true } },
  user: { select: { email: true, preferredLocale: true } },
  plan: {
    select: {
      name: true,
      primaryCountryId: true,
      primaryCountry: { select: { code: true, defaultLocale: true } },
      translations: { select: { locale: true, name: true } },
      countries: {
        select: {
          countryId: true,
          country: { select: { code: true, currency: { select: { code: true } } } },
        },
      },
    },
  },
  level: {
    select: {
      name: true,
      allowancePool: true,
      cardBackgroundHex: true,
      translations: { select: { locale: true, name: true } },
      benefits: {
        where: { isActive: true },
        select: {
          id: true,
          // Phase 7a made benefit rows per-country; without this the grouping
          // §25 asks for cannot be built at all.
          countryId: true,
          serviceKind: true,
          benefitType: true,
          allowanceCount: true,
          percentOff: true,
          fixedPriceCents: true,
          service: { select: { name: true } },
        },
      },
    },
  },
} as const;

/** Inferred from a real query rather than hand-written — the same trick
 *  `membership-card.service.ts` uses, so the type cannot drift from the select. */
function loadCardRow(enrollmentId: string) {
  return prisma.membershipEnrollment.findUnique({
    where: { id: enrollmentId },
    select: contentSelect,
  });
}

type ContentRow = NonNullable<Awaited<ReturnType<typeof loadCardRow>>>;

/**
 * Locale precedence (§25), in order: the linked account's own preference, then
 * the enrollment's stored one, then the plan's primary-country default, then
 * English.
 *
 * The first two must stay in this order. The stored column is a fallback for a
 * row nobody has claimed yet, never an override — reading it first would mean a
 * member who sets their language in the portal keeps getting mail in whatever
 * the partner's spreadsheet said.
 */
export function resolveCardLocale(row: {
  user: { preferredLocale: LocaleCode | null } | null;
  preferredLocale: LocaleCode | null;
  plan: { primaryCountry: { defaultLocale: LocaleCode } };
}): LocaleCode {
  return (
    row.user?.preferredLocale ??
    row.preferredLocale ??
    row.plan.primaryCountry.defaultLocale ??
    LocaleCode.EN
  );
}

function translate(
  translations: { locale: LocaleCode; name: string }[],
  locale: LocaleCode,
  fallback: string,
): string {
  return translations.find((t) => t.locale === locale)?.name ?? fallback;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/** Copy the builder needs. Supplied by the caller so this file owns no JSON. */
export type CardCopy = {
  labelCardholder: string;
  labelMemberId: string;
  labelValidThrough: string;
  labelCoveredIn: string;
  motto: string;
  familyOf: string;
  valueOpenEnded: string;
  valueFrom: string;
  valueEnded: string;
  kindGeneral: string;
  kindSpecialist: string;
  benefitAllowance: string;
  benefitAllowanceShared: string;
  benefitPercent: string;
  benefitFixed: string;
  benefitExcluded: string;
  statusActive: string;
  statusPending: string;
  statusSuspended: string;
  statusExpired: string;
};

function monthYear(date: Date, locale: LocaleCode): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function money(cents: number, currency: string, locale: LocaleCode): string {
  return new Intl.NumberFormat(localeTag(locale), { style: "currency", currency }).format(
    cents / 100,
  );
}

function statusLabel(status: string, copy: CardCopy): string {
  switch (status) {
    case "ACTIVE":
      return copy.statusActive;
    case "SUSPENDED":
      return copy.statusSuspended;
    case "EXPIRED":
      return copy.statusExpired;
    default:
      return copy.statusPending;
  }
}

/**
 * One benefit row as a sentence.
 *
 * The §43 shared-pool wording lives here rather than in the templates so the
 * card, the PDF and the email cannot disagree about it — a dependent must never
 * be told "you have 6 visits" when the pool belongs to their primary and may
 * already be spent. Conditioned on the LEVEL's pool mode: on `PER_PERSON` the
 * dependent really does hold their own units and the shared wording would be
 * false.
 */
function benefitLine(
  benefit: ContentRow["level"]["benefits"][number],
  opts: { copy: CardCopy; locale: LocaleCode; currency: string; sharesPool: boolean },
): CardBenefitLine | null {
  const { copy, locale, currency, sharesPool } = opts;
  const subject =
    benefit.service?.name ??
    (benefit.serviceKind === "SPECIALIST" ? copy.kindSpecialist : copy.kindGeneral);

  switch (benefit.benefitType) {
    case "ALLOWANCE": {
      const count = benefit.allowanceCount ?? 0;
      const template = sharesPool ? copy.benefitAllowanceShared : copy.benefitAllowance;
      return {
        text: interpolate(template, { count: String(count), subject }),
        sharedPool: sharesPool,
      };
    }
    case "PERCENT":
      return {
        text: interpolate(copy.benefitPercent, {
          percent: String(benefit.percentOff ?? 0),
          subject,
        }),
        sharedPool: false,
      };
    case "FIXED":
      return {
        text: interpolate(copy.benefitFixed, {
          price: money(benefit.fixedPriceCents ?? 0, currency, locale),
          subject,
        }),
        sharedPool: false,
      };
    case "EXCLUDED":
      return { text: interpolate(copy.benefitExcluded, { subject }), sharedPool: false };
    default:
      return null;
  }
}

export function buildCardContentFromRow(row: ContentRow, copy: CardCopy): MembershipCardContent {
  const locale = resolveCardLocale(row);
  const sharesPool = row.level.allowancePool === "SHARED" && row.memberType === "DEPENDENT";

  const countryById = new Map(
    row.plan.countries.map((c) => [
      c.countryId,
      { code: c.country.code.toUpperCase(), currency: c.country.currency?.code ?? "EUR" },
    ]),
  );

  // Group by country. A benefit row whose country is somehow not covered is
  // dropped rather than shown under a blank heading — the composite FK makes
  // that unreachable, but a card is the wrong place to find out otherwise.
  const grouped = new Map<string, CardBenefitLine[]>();
  for (const benefit of row.level.benefits) {
    const country = countryById.get(benefit.countryId);
    if (!country) continue;
    const line = benefitLine(benefit, { copy, locale, currency: country.currency, sharesPool });
    if (!line) continue;
    const existing = grouped.get(benefit.countryId);
    if (existing) existing.push(line);
    else grouped.set(benefit.countryId, [line]);
  }

  // Primary country first, then the rest alphabetically by code — a stable
  // order, so a re-issued card lists countries the same way as the first one.
  const orderedIds = [...grouped.keys()].sort((a, b) => {
    if (a === row.plan.primaryCountryId) return -1;
    if (b === row.plan.primaryCountryId) return 1;
    return (countryById.get(a)?.code ?? "").localeCompare(countryById.get(b)?.code ?? "");
  });

  const benefitsByCountry = orderedIds.map((countryId) => {
    const code = countryById.get(countryId)!.code;
    return {
      countryCode: code,
      countryName: countryDisplayName(code, locale),
      lines: grouped.get(countryId)!,
    };
  });

  // The term as one slot value. A future start date is the case §3.4 warns
  // about: the row links ACTIVE and stays ACTIVE while granting nothing until
  // the term opens, so a bare end date would read as live when it is not.
  const now = new Date();
  const validThrough = row.endDate
    ? row.endDate < now
      ? interpolate(copy.valueEnded, { date: monthYear(row.endDate, locale) })
      : monthYear(row.endDate, locale)
    : row.startDate > now
      ? interpolate(copy.valueFrom, { date: monthYear(row.startDate, locale) })
      : copy.valueOpenEnded;

  return {
    enrollmentId: row.id,
    membershipId: row.membershipId,
    holderName: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    accountEmail: row.user?.email ?? null,
    firstName: row.firstName,
    planName: translate(row.plan.translations, locale, row.plan.name),
    levelName: translate(row.level.translations, locale, row.level.name),
    status: row.status,
    validThrough,
    countryCodes: benefitsByCountry.map((c) => c.countryCode),
    memberType: row.memberType,
    sharesPool,
    primaryMembershipId: row.primaryEnrollment?.membershipId ?? null,
    palette: deriveCardPalette(row.level.cardBackgroundHex),
    benefitsByCountry,
    locale,
  };
}

/** The card's own status pill text, localised. Kept out of the row builder so
 *  renderers can print it without importing the copy bundle themselves. */
export function cardStatusLabel(content: MembershipCardContent, copy: CardCopy): string {
  return statusLabel(content.status, copy);
}

export async function loadCardContent(
  enrollmentId: string,
  copy: (locale: LocaleCode) => CardCopy,
): Promise<MembershipCardContent | null> {
  const row = await loadCardRow(enrollmentId);
  if (!row) return null;
  // Two passes: the locale is only knowable from the row, and the copy bundle
  // is only choosable from the locale.
  const locale = resolveCardLocale(row);
  return buildCardContentFromRow(row, copy(locale));
}

export { contentSelect as cardContentSelect };
export type { ContentRow as CardContentRow };
