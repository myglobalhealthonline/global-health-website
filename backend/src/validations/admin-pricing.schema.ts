import { z } from "zod";
import { serviceSlugSchema } from "./admin-services.schema.js";

export const pricingSlugSchema = serviceSlugSchema;

export const adminPricingQuerySchema = z.object({
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

export type AdminPricingQuery = z.infer<typeof adminPricingQuerySchema>;

export const pricingPlanIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminPricingCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  slug: pricingSlugSchema,
  name: z.string().trim().min(1).max(200),
  description: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  priceCents: z.coerce.number().int().min(0),
  currencyCode: z.string().trim().min(1).max(8),
  interval: z.string().trim().min(1).max(64),
  isActive: z.boolean().optional(),
});

export type AdminPricingCreateBody = z.infer<typeof adminPricingCreateBodySchema>;

export const adminPricingUpdateBodySchema = adminPricingCreateBodySchema.partial();

export type AdminPricingUpdateBody = z.infer<typeof adminPricingUpdateBodySchema>;
