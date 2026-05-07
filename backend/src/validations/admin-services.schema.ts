import { z } from "zod";

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
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  specialtyId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
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

export const adminSpecialtyCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  slug: serviceSlugSchema,
  name: z.string().trim().min(1).max(200),
  cardSummary: nullableTrimmedString(1000),
  cardThemeColor: nullableTrimmedString(40),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  primaryServiceId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().min(1).nullable(),
  ),
  imagePath: imagePathFieldSchema.optional(),
  active: z.boolean().optional(),
});

export type AdminSpecialtyCreateBody = z.infer<typeof adminSpecialtyCreateBodySchema>;

export const adminSpecialtyUpdateBodySchema = z
  .object({
    slug: serviceSlugSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    cardSummary: nullableTrimmedString(1000),
    cardThemeColor: nullableTrimmedString(40),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    primaryServiceId: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : v),
      z.string().trim().min(1).nullable(),
    ).optional(),
    imagePath: imagePathFieldSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export type AdminSpecialtyUpdateBody = z.infer<typeof adminSpecialtyUpdateBodySchema>;

export const adminServiceCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  slug: serviceSlugSchema,
  name: z.string().trim().min(1).max(200),
  summary: nullableTrimmedString(4000),
  heroTitle: nullableTrimmedString(200),
  heroDescription: nullableTrimmedString(2000),
  detailBody: nullableTrimmedString(20000),
  ctaLabel: nullableTrimmedString(120),
  legacyPath: legacyPathFieldSchema.optional(),
  specialtyId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().min(1).nullable(),
  ),
  durationMinutes: positiveIntOrNull,
  basePriceCents: nonNegativeIntOrNull,
  currencyCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().max(8).nullable(),
  ),
  imagePath: imagePathFieldSchema.optional(),
  isActive: z.boolean().optional(),
});

export type AdminServiceCreateBody = z.infer<typeof adminServiceCreateBodySchema>;

export const adminServiceUpdateBodySchema = adminServiceCreateBodySchema.partial();

export type AdminServiceUpdateBody = z.infer<typeof adminServiceUpdateBodySchema>;
