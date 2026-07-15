import { z } from "zod";
import { serviceSlugSchema } from "./admin-services.schema.js";

/** Trimmed optional string that collapses "" / undefined → null so partial
 *  updates and blank form fields clear the column consistently (matches the
 *  helper in admin-health-tests.schema). */
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === "" || value === undefined ? null : value));

const markupModeSchema = z.enum(["FIXED", "PERCENT"]);

// ─── Exam-type catalogue (global, country-independent) ─────────────────────

export const examTypeIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminExamTypesQuerySchema = z.object({
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().trim().max(120).optional().transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminExamTypesQuery = z.infer<typeof adminExamTypesQuerySchema>;

const examTypeBaseObject = z.object({
  name: z.string().trim().min(1).max(200),
  slug: serviceSlugSchema,
  category: optionalTrimmed(120),
  description: optionalTrimmed(2000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().optional(),
});

export const adminExamTypeCreateBodySchema = examTypeBaseObject;
export type AdminExamTypeCreateBody = z.infer<typeof adminExamTypeCreateBodySchema>;

export const adminExamTypeUpdateBodySchema = examTypeBaseObject.partial();
export type AdminExamTypeUpdateBody = z.infer<typeof adminExamTypeUpdateBodySchema>;

// ─── Test centers (country-scoped) ─────────────────────────────────────────

export const testCenterIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminTestCentersQuerySchema = z.object({
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().trim().max(120).optional().transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminTestCentersQuery = z.infer<typeof adminTestCentersQuerySchema>;

const testCenterBaseObject = z.object({
  countryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  slug: serviceSlugSchema,
  addressLine: optionalTrimmed(400),
  city: optionalTrimmed(160),
  phone: optionalTrimmed(60),
  email: optionalTrimmed(200),
  notes: optionalTrimmed(4000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().optional(),
});

export const adminTestCenterCreateBodySchema = testCenterBaseObject;
export type AdminTestCenterCreateBody = z.infer<typeof adminTestCenterCreateBodySchema>;

// countryId is immutable on update (same rule as health tests) — omit it here.
export const adminTestCenterUpdateBodySchema = testCenterBaseObject.omit({ countryId: true }).partial();
export type AdminTestCenterUpdateBody = z.infer<typeof adminTestCenterUpdateBodySchema>;

// ─── Test-center exam offerings (join + pricing) ───────────────────────────

export const testCenterExamIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  offeringId: z.string().trim().min(1),
});

/** Shared refinement: PERCENT markup is basis points (0..1,000,000 = 0..10000%);
 *  FIXED markup is cents added on top of cost. Both non-negative. */
const markupValueSchema = z.coerce.number().int().min(0).max(100_000_000);

const testCenterExamBaseObject = z.object({
  examTypeId: z.string().trim().min(1),
  costCents: z.coerce.number().int().min(0).max(100_000_000),
  markupMode: markupModeSchema,
  markupValue: markupValueSchema,
  currencyCode: z.string().trim().min(1).max(8),
  isActive: z.boolean().optional(),
});

export const adminTestCenterExamCreateBodySchema = testCenterExamBaseObject;
export type AdminTestCenterExamCreateBody = z.infer<typeof adminTestCenterExamCreateBodySchema>;

// examTypeId is fixed once an offering exists (change = delete + re-add).
export const adminTestCenterExamUpdateBodySchema = testCenterExamBaseObject
  .omit({ examTypeId: true })
  .partial();
export type AdminTestCenterExamUpdateBody = z.infer<typeof adminTestCenterExamUpdateBodySchema>;
