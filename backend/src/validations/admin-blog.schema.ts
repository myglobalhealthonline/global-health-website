import { z } from "zod";
import { LocaleCode, PublishStatus } from "@prisma/client";

export const localeCodeSchema = z.nativeEnum(LocaleCode);
export const publishStatusSchema = z.nativeEnum(PublishStatus);

const optionalNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const blogSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase URL-safe (a-z, 0-9, hyphens)",
  });

/** Accept "", undefined, null, or an ISO/date string → Date | null. */
const optionalNullableDate = z
  .preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.date().nullable(),
  )
  .optional();

export const adminBlogCreateBodySchema = z.object({
  slug: blogSlugSchema,
  title: z.string().trim().min(1).max(240),
  excerpt: optionalNullableString(600),
  // Admin-uploaded HTML article body. Sanitized server-side before save.
  body: z.string().max(200000).default(""),
  status: publishStatusSchema.optional(),
  locale: localeCodeSchema.optional(),
  category: optionalNullableString(80),
  authorDisplayName: optionalNullableString(160),
  reviewerDisplayName: optionalNullableString(160),
  seoTitle: optionalNullableString(180),
  seoDescription: optionalNullableString(320),
  // Cover image: an uploaded media path/URL (stored as an Asset row and
  // linked via coverAssetId). "" / null clears the cover.
  coverImagePath: optionalNullableString(2000),
  coverImageAlt: optionalNullableString(300),
  // null = global post (not scoped to a single country).
  countryId: optionalNullableString(64),
  publishedAt: optionalNullableDate,
  isActive: z.boolean().optional(),
});

export type AdminBlogCreateBody = z.infer<typeof adminBlogCreateBodySchema>;

export const adminBlogUpdateBodySchema = adminBlogCreateBodySchema.partial();
export type AdminBlogUpdateBody = z.infer<typeof adminBlogUpdateBodySchema>;

export const adminBlogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    publishStatusSchema.optional(),
  ),
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
});

export type AdminBlogQuery = z.infer<typeof adminBlogQuerySchema>;

export const blogIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const publicBlogParamsSchema = z.object({
  slug: blogSlugSchema,
});

export const publicBlogQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
});
