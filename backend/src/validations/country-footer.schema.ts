import { z } from "zod";
import { socialUrlSchema } from "./shared.schema.js";
import type { LocaleCode, Prisma } from "@prisma/client";
import { resolveTranslation } from "../modules/shared/resolve-translation.js";
import { localeCodeSchema } from "./admin-countries.schema.js";

/**
 * Per-country footer content edited at /admin/footer.
 *
 * `tagline`, `contactAddress`, `contactEmail`, `contactPhone`,
 * `contactHours` are plaintext (multi-line tolerated for address +
 * hours). Empty string normalises to null at the route layer so the
 * frontend can fall back to the global default.
 *
 * Social URLs delegate to the shared https://-only `socialUrlSchema`
 * (also used by Doctor social URLs) — rendered as `<a href={...}>` so
 * we never want javascript:/data: schemes.
 *
 * `customColumns` is the structural payload — admin's free-form link
 * columns rendered after the auto-derived Care + Clinics columns on
 * the public footer.
 *
 * `copyrightLine` overrides the "© Global Health" prefix on the
 * bottom-bar copyright line. Useful for markets where a local legal
 * entity owns the brand (e.g. "© Global Health Romania SRL").
 */
const optionalText = (max: number) =>
  z
    .union([z.null(), z.string().trim().max(max)])
    .transform((v) => (v === null || v === "" ? null : v));

const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      // Accept https:// absolute URLs, mailto:, tel:, or site-relative
      // paths starting with "/". Anything else is rejected so admin
      // can't paste a `javascript:` href into a footer link.
      (s) =>
        /^https:\/\//i.test(s) ||
        /^mailto:/i.test(s) ||
        /^tel:/i.test(s) ||
        s.startsWith("/"),
      { message: "Href must be https://, mailto:, tel:, or a / path" },
    ),
  external: z.boolean().optional(),
});

const footerColumnSchema = z.object({
  title: z.string().trim().min(1).max(60),
  links: z.array(footerLinkSchema).min(1).max(10),
});

export const countryFooterUpsertSchema = z.object({
  tagline: optionalText(280),
  contactAddress: optionalText(400),
  contactEmail: z
    .union([
      z.null(),
      z.literal(""),
      z.string().trim().email().max(160),
    ])
    .transform((v) => (v === "" || v === null ? null : v)),
  contactPhone: optionalText(60),
  contactHours: optionalText(160),
  instagramUrl: socialUrlSchema,
  facebookUrl: socialUrlSchema,
  linkedinUrl: socialUrlSchema,
  twitterUrl: socialUrlSchema,
  youtubeUrl: socialUrlSchema,
  customColumns: z.array(footerColumnSchema).max(6).default([]),
  copyrightLine: optionalText(160),
  isActive: z.boolean().default(true),
});

export type CountryFooterUpsertInput = z.infer<typeof countryFooterUpsertSchema>;

/**
 * Admin write payload for one non-default-locale override of a country
 * footer's translatable text. Contact details/social URLs aren't part of
 * this schema — they're base-row-only (see CountryFooterTranslation model
 * comment in schema.prisma).
 */
export const countryFooterTranslationUpsertSchema = z.object({
  locale: localeCodeSchema,
  tagline: optionalText(280),
  contactHours: optionalText(160),
  customColumns: z.array(footerColumnSchema).max(6).optional(),
  copyrightLine: optionalText(160),
});

export type CountryFooterTranslationUpsertInput = z.infer<
  typeof countryFooterTranslationUpsertSchema
>;

/**
 * Output shape returned by both admin GET and public GET endpoints.
 * Mirrors the Prisma row 1:1 — frontend uses this for both the admin
 * edit form (prefill) and the public SiteFooter render.
 */
export type CountryFooterDto = {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  tagline: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  customColumns: Array<{
    title: string;
    links: Array<{ label: string; href: string; external?: boolean }>;
  }>;
  copyrightLine: string | null;
  isActive: boolean;
  updatedAt: string;
  /** Present only when the caller resolved a locale (public route with
   *  `?locale=`). The locale whose copy actually filled the translatable
   *  fields above: requested -> country default -> base columns. */
  resolvedLocale?: LocaleCode;
};

/**
 * Single mapper shared by the admin + public footer routes. Keeps
 * the field list in one place so adding a new column to CountryFooter
 * only touches the DTO type + this function.
 */
type CountryFooterRowWithCountry = Prisma.CountryFooterGetPayload<{
  include: { country: { select: { id: true; code: true; name: true } } };
}>;

export function toCountryFooterDto(
  row: CountryFooterRowWithCountry,
): CountryFooterDto {
  return {
    id: row.id,
    countryId: row.countryId,
    countryCode: row.country.code,
    countryName: row.country.name,
    tagline: row.tagline,
    contactAddress: row.contactAddress,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    contactHours: row.contactHours,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    linkedinUrl: row.linkedinUrl,
    twitterUrl: row.twitterUrl,
    youtubeUrl: row.youtubeUrl,
    customColumns: row.customColumns as CountryFooterDto["customColumns"],
    copyrightLine: row.copyrightLine,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

type CountryFooterTranslationRow = {
  locale: LocaleCode;
  tagline: string | null;
  contactHours: string | null;
  customColumns: unknown;
  copyrightLine: string | null;
};

type CountryFooterRowWithTranslations = CountryFooterRowWithCountry & {
  translations: CountryFooterTranslationRow[];
};

/**
 * Same as toCountryFooterDto, but merges in the best-matching translation
 * row for `requested` (requested -> country default -> base columns).
 * Only the translatable fields (tagline, contactHours, customColumns,
 * copyrightLine) can change; contact details/social URLs always come from
 * the base row.
 */
export function toCountryFooterDtoWithLocale(
  row: CountryFooterRowWithTranslations,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): CountryFooterDto {
  const base = toCountryFooterDto(row);
  const { tr, resolvedLocale } = resolveTranslation(row.translations, requested, defaultLocale);
  if (!tr) return { ...base, resolvedLocale };
  return {
    ...base,
    tagline: tr.tagline ?? base.tagline,
    contactHours: tr.contactHours ?? base.contactHours,
    customColumns:
      (tr.customColumns as CountryFooterDto["customColumns"] | null) ?? base.customColumns,
    copyrightLine: tr.copyrightLine ?? base.copyrightLine,
    resolvedLocale,
  };
}
