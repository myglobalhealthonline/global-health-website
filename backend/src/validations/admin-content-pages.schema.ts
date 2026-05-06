import { LocaleCode, PublishStatus } from "@prisma/client";
import { z } from "zod";

export const contentPageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, {
    message: "pageKey must be URL/key-safe (a-z, 0-9, -, _)",
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

export const adminContentPagesQuerySchema = z.object({
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

export type AdminContentPagesQuery = z.infer<typeof adminContentPagesQuerySchema>;

export const contentPageIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const adminContentPageCreateBodyBaseSchema = z.object({
  countryId: optionalCuid.optional(),
  pageKey: contentPageKeySchema,
  title: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(100_000),
  locale: z.nativeEnum(LocaleCode),
  status: z.nativeEnum(PublishStatus).default(PublishStatus.DRAFT),
  seoTitle: optionalTrimmed(120).optional(),
  seoDescription: optionalTrimmed(320).optional(),
  lastReviewedAt: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce.date().nullable(),
  ).optional(),
  isActive: z.boolean().optional(),
});

export const adminContentPageCreateBodySchema = adminContentPageCreateBodyBaseSchema
  .superRefine((value, ctx) => {
    if (value.status === PublishStatus.PUBLISHED && value.body.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "body/content is required for published pages",
      });
    }
  });

export type AdminContentPageCreateBody = z.infer<typeof adminContentPageCreateBodySchema>;

export const adminContentPageUpdateBodySchema = adminContentPageCreateBodyBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (value.status === PublishStatus.PUBLISHED && value.body !== undefined && value.body.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "body/content is required for published pages",
      });
    }
  });

export type AdminContentPageUpdateBody = z.infer<typeof adminContentPageUpdateBodySchema>;
