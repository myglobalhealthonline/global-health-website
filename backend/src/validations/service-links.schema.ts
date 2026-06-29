import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

const linkTypeSchema = z.enum(["UPGRADE", "ENTRY", "REFERRAL", "COMPLEMENTARY"]);

// Rule 5 — descriptive anchor text. Reject generic phrases.
const BANNED_ANCHOR = /^(click here|find out more|book now|our service|learn more|read more|here)$/i;

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === undefined || v === null || v === "" ? null : v));

export const serviceLinkIdParamsSchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
});

export const serviceLinkTranslationSchema = z
  .object({
    locale: localeCodeSchema,
    heading: z.string().trim().min(1).max(200),
    body: nullableTrimmed(600),
    ctaLabel: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((v) => !BANNED_ANCHOR.test(v.trim()), {
        message:
          "Use descriptive anchor text (the service name), not 'click here' / 'book now' / 'find out more'",
      }),
  })
  .strict();

export const serviceLinkEntrySchema = z
  .object({
    type: linkTypeSchema,
    targetServiceId: nullableTrimmed(64),
    targetHref: nullableTrimmed(500),
    priority: z.coerce.number().int().min(0).max(1000).default(0),
    isActive: z.boolean().default(true),
    anchorSlot: nullableTrimmed(64),
    translations: z.array(serviceLinkTranslationSchema).min(1).max(6),
  })
  .strict()
  .refine((d) => Boolean(d.targetServiceId) || Boolean(d.targetHref), {
    message: "Provide a target service or a target href",
    path: ["targetServiceId"],
  });

export const serviceLinksReplaceBodySchema = z
  .object({
    links: z.array(serviceLinkEntrySchema).max(12),
  })
  .strict();

export type ServiceLinksReplaceBody = z.infer<typeof serviceLinksReplaceBodySchema>;
