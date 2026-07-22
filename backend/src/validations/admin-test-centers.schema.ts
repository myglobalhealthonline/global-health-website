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

/** The catalogue holds thousands of rows (a single supplier price list is ~4.2k),
 *  so the admin list is paginated and filterable. `pageSize` is capped at 200 —
 *  enough for a generous table page, small enough that no caller can pull the
 *  whole catalogue in one request. */
export const adminExamTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(50).transform((n) => Math.min(n, 200)),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  category: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v)),
  /** Exclude exam types this center already prices — powers the "add an exam"
   *  picker, which must not offer duplicates out of a 4k-row catalogue. */
  notOnCenterId: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v)),
  search: z.string().trim().max(120).optional().transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminExamTypesQuery = z.infer<typeof adminExamTypesQuerySchema>;

/** Our catalogue reference — "GH" + group number + "-" + 4-digit counter
 *  (e.g. GH1-0001, GH15-0219). Optional: exam types created by hand before the
 *  scheme, or outside any supplier import, may have none. */
const examTypeCodeSchema = z
  .string()
  .trim()
  .regex(/^GH\d{1,2}-\d{4}$/, "Code must look like GH1-0001")
  .optional()
  .nullable()
  .transform((value) => (value === "" || value === undefined ? null : value));

const examTypeBaseObject = z.object({
  code: examTypeCodeSchema,
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

/** A single center can carry the whole supplier catalogue, so its offering list
 *  is paginated and searchable on the same terms as the exam catalogue. */
export const adminTestCenterExamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(50).transform((n) => Math.min(n, 200)),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  category: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v)),
  search: z.string().trim().max(120).optional().transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminTestCenterExamsQuery = z.infer<typeof adminTestCenterExamsQuerySchema>;

/** Shared refinement: PERCENT markup is basis points (0..1,000,000 = 0..10000%);
 *  FIXED markup is cents added on top of cost. Both non-negative. */
const markupValueSchema = z.coerce.number().int().min(0).max(100_000_000);

const testCenterExamBaseObject = z.object({
  examTypeId: z.string().trim().min(1),
  /// The center's own code for this exam (e.g. Synlab "Código"), used to
  /// reconcile our orders against theirs.
  supplierCode: optionalTrimmed(60),
  /// Result turnaround the center quotes, in business days.
  turnaroundDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
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
