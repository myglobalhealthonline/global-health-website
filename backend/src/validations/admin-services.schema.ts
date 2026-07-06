import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

export const serviceKindSchema = z.enum([
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
  "HEALTH_TEST",
  "HOME_DELIVERY",
]);

/** Lowercase URL segment style: letters, numbers, hyphens (no leading/trailing hyphen). */
export const serviceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase URL-safe (a-z, 0-9, hyphens)",
  });

const legacyPathFieldSchema = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.union([z.null(), z.string().trim().max(500)]),
).refine((v) => v === null || (typeof v === "string" && v.startsWith("/")), {
  message: "legacyPath must start with / when provided",
});

const positiveIntOrNull = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.coerce.number().int().positive().optional(),
);

const nonNegativeIntOrNull = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.coerce.number().int().min(0).optional(),
);

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

const imagePathFieldSchema = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.union([z.null(), z.string().trim().max(500)]),
).refine((v) => v === null || (typeof v === "string" && (v.startsWith("/") || /^https?:\/\//i.test(v))), {
  message: "Image path must start with / or http(s):// when provided",
});

export const adminServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Clamp oversized requests to 100 instead of rejecting them — callers (e.g.
  // dropdowns) pass a large pageSize to mean "all"; the service layer also caps
  // at 100. Rejecting here previously 400'd the whole request → empty dropdowns.
  pageSize: z.coerce.number().int().min(1).default(20).transform((n) => Math.min(n, 100)),
  kind: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    serviceKindSchema.optional(),
  ),
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminServicesQuery = z.infer<typeof adminServicesQuerySchema>;

export const serviceIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminSpecialtiesQuerySchema = z.object({
  countryId: z.string().trim().min(1, "countryId is required"),
});

/** Per-locale CMS content for a specialty (name + card summary). */
const specialtyTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  name: z.string().trim().min(1).max(200),
  cardSummary: nullableTrimmedString(1000),
});

export type SpecialtyTranslationInput = z.infer<typeof specialtyTranslationEntrySchema>;

export const adminSpecialtyCreateBodySchema = z
  .object({
    countryId: z.string().trim().min(1),
    slug: serviceSlugSchema,
    name: z.string().trim().min(1).max(200),
    cardSummary: nullableTrimmedString(1000),
    cardThemeColor: nullableTrimmedString(40),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    imagePath: imagePathFieldSchema.optional(),
    active: z.boolean().optional(),
    translations: z.array(specialtyTranslationEntrySchema).max(6).optional(),
  })
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx));

export type AdminSpecialtyCreateBody = z.infer<typeof adminSpecialtyCreateBodySchema>;

export const adminSpecialtyUpdateBodySchema = z
  .object({
    slug: serviceSlugSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    cardSummary: nullableTrimmedString(1000),
    cardThemeColor: nullableTrimmedString(40),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    imagePath: imagePathFieldSchema.optional(),
    active: z.boolean().optional(),
    translations: z.array(specialtyTranslationEntrySchema).max(6).optional(),
  })
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx))
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export type AdminSpecialtyUpdateBody = z.infer<typeof adminSpecialtyUpdateBodySchema>;

/**
 * Per-locale CMS content for a service. `name` is required (the table's
 * invariant); every other field is optional and falls back to the
 * default-locale base column when absent. The default-locale entry mirrors
 * the top-level body fields (which still seed the Service base columns).
 */
const serviceTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  name: z.string().trim().min(1).max(200),
  summary: nullableTrimmedString(4000),
  seoTitle: nullableTrimmedString(200),
  seoDescription: nullableTrimmedString(500),
  heroTitle: nullableTrimmedString(200),
  heroDescription: nullableTrimmedString(2000),
  detailBody: nullableTrimmedString(100000),
  ctaLabel: nullableTrimmedString(120),
});

export type ServiceTranslationInput = z.infer<typeof serviceTranslationEntrySchema>;

/** Reject the same locale appearing twice in a translations array. */
export function validateUniqueLocales(
  translations: { locale: string }[] | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!translations) return;
  const seen = new Set<string>();
  translations.forEach((entry, index) => {
    if (seen.has(entry.locale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate translation for locale ${entry.locale}`,
        path: ["translations", index, "locale"],
      });
    }
    seen.add(entry.locale);
  });
}

const adminServiceBodyShape = {
  countryId: z.string().trim().min(1),
  kind: serviceKindSchema.default("GENERAL"),
  slug: serviceSlugSchema,
  name: z.string().trim().min(1).max(200),
  summary: nullableTrimmedString(4000),
  seoTitle: nullableTrimmedString(200),
  seoDescription: nullableTrimmedString(500),
  heroTitle: nullableTrimmedString(200),
  heroDescription: nullableTrimmedString(2000),
  detailBody: nullableTrimmedString(100000),
  ctaLabel: nullableTrimmedString(120),
  /** Per-locale display content (name, summary, SEO, hero, detail, CTA).
   *  When present the default-locale entry should mirror the top-level
   *  fields above; backend upserts one ServiceTranslation row per entry. */
  translations: z.array(serviceTranslationEntrySchema).max(6).optional(),
  legacyPath: legacyPathFieldSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  durationMinutes: positiveIntOrNull,
  basePriceCents: nonNegativeIntOrNull,
  currencyCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().max(8).nullable(),
  ),
  imagePath: imagePathFieldSchema.optional(),
  /** Per-item shipping price the admin charges patients (cents).
   *  0 means no shipping line for this item — which is the default
   *  for online consultations. Use a non-zero value for physical
   *  things admin posts (e.g. prescription delivery). */
  shippingCents: z.coerce
    .number({ invalid_type_error: "Shipping must be a whole number" })
    .int("Shipping must be a whole number (no decimals)")
    .min(0, "Shipping must be zero or greater")
    .max(100000, "Shipping looks too large")
    .optional(),
  /** Additional product images. Hero image still flows through `imagePath`
   *  / Asset; these populate Service.galleryImagePaths directly. */
  galleryImagePaths: z
    .array(z.string().trim().min(1).max(2000))
    .max(12)
    .optional()
    .default([]),
  /** Doctor ids assigned to this service. Public consult flow filters
   *  doctor cards by this set; omit / undefined keeps existing
   *  assignments untouched (only applied when the admin form sends it). */
  doctorIds: z
    .array(z.string().trim().min(1).max(64))
    .max(200)
    .optional(),
  isActive: z.boolean().optional(),
} satisfies z.ZodRawShape;

export const adminServiceCreateBodySchema = z
  .object(adminServiceBodyShape)
  .superRefine((value, ctx) => {
    validateUniqueLocales(value.translations, ctx);
  });

export type AdminServiceCreateBody = z.infer<typeof adminServiceCreateBodySchema>;

export const adminServiceUpdateBodySchema = z
  .object({
    ...adminServiceBodyShape,
    kind: serviceKindSchema.optional(),
  })
  .partial()
  .superRefine((value, ctx) => {
    validateUniqueLocales(value.translations, ctx);
  });

export type AdminServiceUpdateBody = z.infer<typeof adminServiceUpdateBodySchema>;

// ─── Service FAQ schemas ──────────────────────────────────────────────────────

export const serviceFaqIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  faqId: z.string().trim().min(1),
});

/** Per-locale override of a FAQ's question/answer. Mirrors
 *  serviceTranslationEntrySchema — the default-locale entry mirrors the
 *  top-level question/answer, which still seed the ServiceFaq base columns. */
const serviceFaqTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(5000),
});

export type ServiceFaqTranslationInput = z.infer<typeof serviceFaqTranslationEntrySchema>;

export const serviceFaqCreateBodySchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(5000),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    isVisible: z.boolean().optional(),
    translations: z.array(serviceFaqTranslationEntrySchema).max(6).optional(),
  })
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx));

export const serviceFaqUpdateBodySchema = z
  .object({
    question: z.string().trim().min(1).max(500).optional(),
    answer: z.string().trim().min(1).max(5000).optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    isVisible: z.boolean().optional(),
    translations: z.array(serviceFaqTranslationEntrySchema).max(6).optional(),
  })
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx))
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export const serviceFaqReorderBodySchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(50),
});

export type ServiceFaqCreateBody = z.infer<typeof serviceFaqCreateBodySchema>;
export type ServiceFaqUpdateBody = z.infer<typeof serviceFaqUpdateBodySchema>;
export type ServiceFaqReorderBody = z.infer<typeof serviceFaqReorderBodySchema>;

const reorderItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  sortOrder: z.number().int().min(0).max(9999),
});

export const bulkReorderBodySchema = z.object({
  items: z.array(reorderItemSchema).min(1).max(200),
});

export type BulkReorderBody = z.infer<typeof bulkReorderBodySchema>;
