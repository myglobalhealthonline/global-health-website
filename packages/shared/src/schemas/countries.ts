import { z } from "zod";
import { PUBLISH_STATUSES } from "../enums.js";

const SLUG = z.string().trim().min(2).max(8).regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens only");
const CODE = z.string().trim().min(2).max(4).regex(/^[A-Z]{2,4}$/, "uppercase letters only");

/** Common writable fields shared by create + update. */
export const countryWritableSchema = z.object({
  code: CODE,
  slug: SLUG,
  name: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(2).max(8),
  currencySymbol: z.string().trim().max(8).nullable(),
  languages: z.array(z.string().trim().min(1)).default([]),
  phone: z.string().trim().max(40).nullable(),
  email: z.string().trim().max(120).nullable(),
  whatsapp: z.string().trim().max(40).nullable(),
  heroTitle: z.string().trim().max(200).nullable(),
  heroSubtitle: z.string().trim().max(400).nullable(),
  ctaLabel: z.string().trim().max(80).nullable(),
  active: z.boolean(),
});

/** Status transition is its own field — distinct from "active" toggle. */
export const countryStatusSchema = z.enum(PUBLISH_STATUSES);

export const countryCreateSchema = countryWritableSchema.extend({
  status: countryStatusSchema.default("DRAFT"),
});

export const countryUpdateSchema = countryWritableSchema.partial().extend({
  status: countryStatusSchema.optional(),
});

export const countryListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: countryStatusSchema.optional(),
  active: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().optional()),
  page: z.coerce.number().int().positive().max(10_000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type CountryWritable = z.infer<typeof countryWritableSchema>;
export type CountryCreateInput = z.infer<typeof countryCreateSchema>;
export type CountryUpdateInput = z.infer<typeof countryUpdateSchema>;
export type CountryListQuery = z.infer<typeof countryListQuerySchema>;

/** Country shape returned by the API. Plain JSON-safe object. */
export type CountryDTO = {
  id: string;
  code: string;
  slug: string;
  name: string;
  flagUrl: string | null;
  currency: string;
  currencySymbol: string | null;
  languages: string[];
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  ctaLabel: string | null;
  status: "DRAFT" | "PUBLISHED";
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  counts?: {
    services: number;
    doctorLinks: number;
    categoryLinks: number;
  };
};
