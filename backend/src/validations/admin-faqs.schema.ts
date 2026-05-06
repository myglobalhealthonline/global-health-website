import { LocaleCode } from "@prisma/client";
import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(max).nullable(),
  );

const optionalCuid = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().min(1).nullable(),
);

export const adminFaqsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  locale: z.nativeEnum(LocaleCode).optional(),
  countryId: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().trim().min(1).optional(),
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

export type AdminFaqsQuery = z.infer<typeof adminFaqsQuerySchema>;

export const faqIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminFaqCreateBodySchema = z.object({
  countryId: optionalCuid.optional(),
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(50_000),
  locale: z.nativeEnum(LocaleCode),
  category: optionalTrimmed(120).optional(),
  placementKey: optionalTrimmed(120).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().optional(),
});

export type AdminFaqCreateBody = z.infer<typeof adminFaqCreateBodySchema>;

export const adminFaqUpdateBodySchema = adminFaqCreateBodySchema.partial();

export type AdminFaqUpdateBody = z.infer<typeof adminFaqUpdateBodySchema>;
