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

export const pageContentPageKeySchema = z.nativeEnum(PageKey);
export const pageContentLocaleSchema = z.nativeEnum(LocaleCode);
export const pageContentStatusSchema = z.nativeEnum(PublishStatus);

// Trimmed non-empty strings, blank entries dropped, capped.
const stringListSchema = (cap: number) =>
  z
    .array(z.string().trim().max(2000))
    .optional()
    .nullable()
    .transform((v) => (v ?? []).map((s) => s.trim()).filter((s) => s.length > 0).slice(0, cap));

const faqListSchema = z
  .array(
    z.object({
      question: z.string().trim().max(400),
      answer: z.string().trim().max(4000),
    }),
  )
  .optional()
  .nullable()
  .transform((v) =>
    (v ?? [])
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question.length > 0 && item.answer.length > 0)
      .slice(0, 20),
  );

export const pageContentTranslationInputSchema = z.object({
  locale: pageContentLocaleSchema,
  heroTitle: optionalNullableString(240),
  heroSubtitle: optionalNullableString(480),
  heroTitleLead: optionalNullableString(240),
  heroTitleAccent: optionalNullableString(240),
  ctaLabel: optionalNullableString(120),
  intro: optionalNullableString(4000),
  whoForTitle: optionalNullableString(240),
  whoForIntro: optionalNullableString(2000),
  whoForItems: stringListSchema(20),
  whyChooseTitle: optionalNullableString(240),
  whyChooseItems: stringListSchema(20),
  faq: faqListSchema,
  disclaimerParagraphs: stringListSchema(12),
  disclaimerShort: optionalNullableString(2000),
  body: z.string().max(60000).optional().nullable().transform((v) => v ?? null),
  seoTitle: optionalNullableString(180),
  seoDescription: optionalNullableString(320),
});

export type PageContentTranslationInput = z.infer<typeof pageContentTranslationInputSchema>;

export const pageContentUpsertBodySchema = z.object({
  status: pageContentStatusSchema.optional(),
  isActive: z.boolean().optional(),
  heroImagePath: optionalNullableString(2000),
  ogImagePath: optionalNullableString(2000),
  ctaHref: optionalNullableHref,
  showIntro: z.boolean().optional(),
  showWhoFor: z.boolean().optional(),
  showWhyChoose: z.boolean().optional(),
  showFaq: z.boolean().optional(),
  showDisclaimer: z.boolean().optional(),
  showBody: z.boolean().optional(),
  translations: z.array(pageContentTranslationInputSchema).min(1),
});

export type PageContentUpsertBody = z.infer<typeof pageContentUpsertBodySchema>;

export const pageContentFlagsBodySchema = z
  .object({
    status: pageContentStatusSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.isActive !== undefined, {
    message: "At least one of status or isActive is required",
  });

export type PageContentFlagsBody = z.infer<typeof pageContentFlagsBodySchema>;

export const pageContentAdminParamsSchema = z.object({
  countryId: z.string().trim().min(1),
  pageKey: pageContentPageKeySchema,
});

export const pageContentPublicParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
  pageKey: pageContentPageKeySchema,
});

export const pageContentPublicQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    pageContentLocaleSchema.optional(),
  ),
});
