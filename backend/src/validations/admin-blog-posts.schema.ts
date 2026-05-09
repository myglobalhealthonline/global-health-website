import { LocaleCode, PublishStatus } from "@prisma/client";
import { z } from "zod";

export const blogSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase URL-safe (a-z, 0-9, hyphens)",
  });

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(max).nullable(),
  );

const optionalCuid = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().min(1).nullable(),
);

export const adminBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  locale: z.nativeEnum(LocaleCode).optional(),
  countryId: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  status: z.nativeEnum(PublishStatus).optional(),
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

export type AdminBlogPostsQuery = z.infer<typeof adminBlogPostsQuerySchema>;

export const blogPostIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const adminBlogPostCreateBodyBaseSchema = z.object({
  countryId: optionalCuid.optional(),
  slug: blogSlugSchema,
  title: z.string().trim().min(1).max(240),
  excerpt: optionalTrimmed(500).optional(),
  body: z.string().trim().min(1).max(100_000),
  status: z.nativeEnum(PublishStatus).default(PublishStatus.DRAFT),
  locale: z.nativeEnum(LocaleCode),
  category: optionalTrimmed(120).optional(),
  authorDisplayName: optionalTrimmed(120).optional(),
  reviewerDisplayName: optionalTrimmed(120).optional(),
  coverAssetId: optionalCuid.optional(),
  seoTitle: optionalTrimmed(120).optional(),
  seoDescription: optionalTrimmed(320).optional(),
  publishedAt: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce.date().nullable(),
  ).optional(),
  isActive: z.boolean().optional(),
});

export const adminBlogPostCreateBodySchema = adminBlogPostCreateBodyBaseSchema
  .superRefine((value, ctx) => {
    if (value.status === PublishStatus.PUBLISHED && value.body.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "body/content is required for published posts",
      });
    }
  });

export type AdminBlogPostCreateBody = z.infer<typeof adminBlogPostCreateBodySchema>;

export const adminBlogPostUpdateBodySchema = adminBlogPostCreateBodyBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (value.status === PublishStatus.PUBLISHED && value.body !== undefined && value.body.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "body/content is required for published posts",
      });
    }
  });

export type AdminBlogPostUpdateBody = z.infer<typeof adminBlogPostUpdateBodySchema>;
