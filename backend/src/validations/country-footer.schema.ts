import { z } from "zod";

/**
 * Per-country footer content edited at /admin/footer.
 *
 * `tagline`, `contactAddress`, `contactEmail`, `contactPhone`,
 * `contactHours` are plaintext (multi-line tolerated for address +
 * hours). Empty string normalises to null at the route layer so the
 * frontend can fall back to the global default.
 *
 * Social URLs restrict to https:// only (same shape as Doctor social
 * URLs added in the booking-fields migration) — rendered as
 * `<a href={...}>` so we never want javascript:/data: schemes.
 *
 * `customColumns` is the structural payload — admin's free-form link
 * columns rendered after the auto-derived Care + Clinics columns on
 * the public footer.
 *
 * `copyrightLine` overrides the "© Global Health" prefix on the
 * bottom-bar copyright line. Useful for markets where a local legal
 * entity owns the brand (e.g. "© Global Health Romania SRL").
 */
const httpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^https:\/\/[^\s<>"']+$/i, { message: "Must be an https:// URL" });

const optionalHttpsUrl = z
  .union([z.null(), z.literal(""), httpsUrlSchema])
  .transform((v) => (v === "" || v === null ? null : v));

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
  instagramUrl: optionalHttpsUrl,
  facebookUrl: optionalHttpsUrl,
  linkedinUrl: optionalHttpsUrl,
  twitterUrl: optionalHttpsUrl,
  youtubeUrl: optionalHttpsUrl,
  customColumns: z.array(footerColumnSchema).max(6).default([]),
  copyrightLine: optionalText(160),
  isActive: z.boolean().default(true),
});

export type CountryFooterUpsertInput = z.infer<typeof countryFooterUpsertSchema>;

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
};
