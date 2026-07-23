import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === undefined || v === null || v === "" ? null : v));

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase hyphenated slug, e.g. hypertension");

export const seoLandingIdParamsSchema = z.object({
  countryId: z.string().trim().min(1).max(64),
});

export const seoLandingPageParamsSchema = z.object({
  countryId: z.string().trim().min(1).max(64),
  pageId: z.string().trim().min(1).max(64),
});

const faqItemSchema = z
  .object({
    question: z.string().trim().min(1).max(300),
    answer: z.string().trim().min(1).max(4000),
  })
  .strict();

export const seoLandingTranslationSchema = z
  .object({
    locale: localeCodeSchema,
    title: z.string().trim().min(1).max(200),
    seoTitle: nullableTrimmed(200),
    seoDescription: nullableTrimmed(400),
    bodyHtml: z.string().trim().max(200000).optional().nullable().transform((v) =>
      v === undefined || v === null || v === "" ? null : v,
    ),
    faq: z.array(faqItemSchema).max(20).optional().nullable(),
  })
  .strict();

const relatedLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    href: z.string().trim().min(1).max(300).regex(/^\//, "href must start with /"),
  })
  .strict();

export const seoLandingTemplateSchema = z
  .object({
    doctorLanguage: z.string().trim().min(1).max(60).optional(),
    doctorSlugs: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
    ctaService: z.string().trim().min(1).max(120).optional(),
    related: z.array(relatedLinkSchema).max(8).optional(),
  })
  .strict();

export const seoLandingUpsertBodySchema = z
  .object({
    slug: slugSchema,
    isPublished: z.boolean().optional().default(false),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional().default(0),
    translations: z.array(seoLandingTranslationSchema).min(1).max(6),
    template: seoLandingTemplateSchema.optional().nullable(),
  })
  .strict();

export type SeoLandingUpsertBody = z.infer<typeof seoLandingUpsertBodySchema>;
