import { z } from "zod";
import { LocaleCode, PageKey, PublishStatus } from "@prisma/client";

const optionalNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalNullableHref = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine(
    (v) => v === null || /^https?:\/\//i.test(v) || v.startsWith("/") || v.startsWith("#"),
    { message: "CTA href must be an absolute URL, a path starting with /, or an anchor starting with #" },
  );

export const pageKeySchema = z.nativeEnum(PageKey);
export const localeCodeSchema = z.nativeEnum(LocaleCode);
export const publishStatusSchema = z.nativeEnum(PublishStatus);

export const adminPagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  pageKey: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    pageKeySchema.optional(),
  ),
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    publishStatusSchema.optional(),
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

export type AdminPagesQuery = z.infer<typeof adminPagesQuerySchema>;

export const pageIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminPageCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  pageKey: pageKeySchema,
  locale: localeCodeSchema,
  status: publishStatusSchema.optional(),
  title: z.string().trim().min(1).max(240),
  body: z.string().max(60000).default(""),
  heroTitle: optionalNullableString(240),
  heroSubtitle: optionalNullableString(480),
  heroImageAssetId: optionalNullableString(64),
  heroImagePath: optionalNullableString(2000),
  ctaLabel: optionalNullableString(120),
  ctaHref: optionalNullableHref,
  ogImageAssetId: optionalNullableString(64),
  ogImagePath: optionalNullableString(2000),
  seoTitle: optionalNullableString(180),
  seoDescription: optionalNullableString(320),
  isActive: z.boolean().optional(),
});

export type AdminPageCreateBody = z.infer<typeof adminPageCreateBodySchema>;

export const adminPageUpdateBodySchema = adminPageCreateBodySchema.partial();

export type AdminPageUpdateBody = z.infer<typeof adminPageUpdateBodySchema>;

export const publicPageParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
  pageKey: pageKeySchema,
});

export const publicPageQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
});
