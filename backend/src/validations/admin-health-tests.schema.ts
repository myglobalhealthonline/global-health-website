import { z } from "zod";
import { serviceSlugSchema, validateUniqueLocales } from "./admin-services.schema.js";
import { localeCodeSchema } from "./admin-countries.schema.js";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === "" || value === undefined ? null : value));

const optionalStringArray = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    .optional()
    .default([]);

const extraSectionSchema = z.object({
  heading: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8000),
});

export const adminHealthTestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  countryId: z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : v), z.string().trim().min(1).optional()),
  countryCode: z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : v), z.string().trim().min(1).max(8).optional()),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().trim().max(120).optional().transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminHealthTestsQuery = z.infer<typeof adminHealthTestsQuerySchema>;

export const healthTestIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

/**
 * Per-locale CMS content for a health test. Covers the fields rendered
 * today (title, shortDescription, sampleType, resultsTimeline) plus SEO
 * and detail copy for forward-compat. Array/JSON fields stay on the base
 * row only for now (no public detail page renders them yet).
 */
const healthTestTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  title: z.string().trim().min(1).max(200),
  shortDescription: optionalTrimmed(4000),
  sampleType: optionalTrimmed(120),
  resultsTimeline: optionalTrimmed(240),
  heroButtonLabel: optionalTrimmed(80),
  detailIntro: optionalTrimmed(12000),
  seoTitle: optionalTrimmed(200),
  seoDescription: optionalTrimmed(320),
});

export type HealthTestTranslationInput = z.infer<typeof healthTestTranslationEntrySchema>;

const adminHealthTestBaseObject = z.object({
  countryId: z.string().trim().min(1),
  slug: serviceSlugSchema,
  title: z.string().trim().min(1).max(200),
  shortDescription: optionalTrimmed(4000),
  priceCents: z.coerce.number().int().min(0),
  currencyCode: z.string().trim().min(1).max(8),
  productImagePath: z
    .string({ required_error: "Product image is required" })
    .trim()
    .min(1, "Product image is required")
    .max(2000, "Product image path is too long"),
  galleryImagePaths: optionalStringArray(12, 2000),
  sampleType: optionalTrimmed(120),
  resultsTimeline: optionalTrimmed(240),
  heroButtonLabel: optionalTrimmed(80),
  detailIntro: optionalTrimmed(12000),
  whatThisTestCovers: optionalStringArray(24, 500),
  whyGetTested: optionalStringArray(24, 1000),
  extraSections: z.array(extraSectionSchema).max(12).optional().nullable().transform((v) => (v == null ? null : v)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
  /** null = unlimited; 0 = sold out. Public card shows "Only N left"
   *  when 1..5. */
  stock: z.coerce
    .number({ invalid_type_error: "Stock must be a whole number" })
    .int("Stock must be a whole number (no decimals)")
    .min(0, "Stock must be zero or greater")
    .optional()
    .nullable(),
  /** Per-kit shipping price the admin charges patients (cents).
   *  Health tests ship a physical sample kit, so this normally
   *  has a value. 0 = no shipping line. */
  shippingCents: z.coerce
    .number({ invalid_type_error: "Shipping must be a whole number" })
    .int("Shipping must be a whole number (no decimals)")
    .min(0, "Shipping must be zero or greater")
    .max(100000, "Shipping looks too large")
    .optional(),
  seoTitle: optionalTrimmed(200),
  seoDescription: optionalTrimmed(320),
  legacyPath: optionalTrimmed(240),
  /** Per-locale CMS content. The default-locale entry mirrors the base
   *  fields above; backend upserts one HealthTestTranslation per entry. */
  translations: z.array(healthTestTranslationEntrySchema).max(6).optional(),
});

export const adminHealthTestCreateBodySchema = adminHealthTestBaseObject.superRefine(
  (value, ctx) => validateUniqueLocales(value.translations, ctx),
);

export type AdminHealthTestCreateBody = z.infer<typeof adminHealthTestCreateBodySchema>;

export const adminHealthTestUpdateBodySchema = adminHealthTestBaseObject
  .partial()
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx));

export type AdminHealthTestUpdateBody = z.infer<typeof adminHealthTestUpdateBodySchema>;
