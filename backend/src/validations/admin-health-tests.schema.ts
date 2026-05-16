import { z } from "zod";
import { serviceSlugSchema } from "./admin-services.schema.js";

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

export const adminHealthTestCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  slug: serviceSlugSchema,
  title: z.string().trim().min(1).max(200),
  shortDescription: optionalTrimmed(4000),
  priceCents: z.coerce.number().int().min(0),
  currencyCode: z.string().trim().min(1).max(8),
  productImagePath: z.string().trim().min(1).max(2000),
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
  seoTitle: optionalTrimmed(200),
  seoDescription: optionalTrimmed(320),
  legacyPath: optionalTrimmed(240),
});

export type AdminHealthTestCreateBody = z.infer<typeof adminHealthTestCreateBodySchema>;
export const adminHealthTestUpdateBodySchema = adminHealthTestCreateBodySchema.partial();
export type AdminHealthTestUpdateBody = z.infer<typeof adminHealthTestUpdateBodySchema>;
