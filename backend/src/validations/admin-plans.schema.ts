import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

/**
 * Zod contracts for the Sprint 2 admin plan-management surface (§4, §25.1).
 * Shape validation only; cross-country / PRESCRIPTION integrity is enforced in
 * the service layer where DB lookups are available (§36.10/§36.11).
 */

/** Lowercase URL-safe slug (a-z, 0-9, hyphens). */
export const planSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase URL-safe (a-z, 0-9, hyphens)",
  });

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

const currencyCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(8)
  .transform((v) => v.toUpperCase());

export const billingIntervalSchema = z.enum(["MONTHLY"]);
export const planTypeSchema = z.enum(["ESSENTIAL", "COMPREHENSIVE", "PREMIUM"]);
export const planDiscountModeSchema = z.enum(["NONE", "PERCENT", "FIXED"]);
export const perkKeySchema = z.enum([
  "SPECIALIST_DISCOUNT",
  "FAMILY_USAGE",
  "WELLNESS_REDEMPTION",
  "TEST_KIT_REDEMPTION",
  "HIGHER_DISCOUNT_TIER",
]);
export const perkUnlockModeSchema = z.enum([
  "MONTH_1",
  "AFTER_PAID_MONTHS",
  "MANUAL_APPROVAL",
  "NOT_AVAILABLE",
]);
export const creditKindSchema = z.enum(["CONSULTATION", "WELLNESS"]);

// ─── Plan CRUD ───────────────────────────────────────────────────────────────

export const adminPlansQuerySchema = z.object({
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  includeInactive: z.preprocess((v) => {
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
});

const planCreateBase = z.object({
  countryId: z.string().trim().min(1),
  slug: planSlugSchema,
  // Plan tier — chosen at create, immutable after (omitted from the update schema).
  planType: planTypeSchema,
  name: z.string().trim().min(1).max(200),
  shortDescription: nullableTrimmedString(500),
  longDescription: nullableTrimmedString(5000),
  monthlyPriceCents: z.coerce.number().int().min(0),
  currencyCode: currencyCodeSchema,
  billingInterval: billingIntervalSchema.default("MONTHLY"),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  badgeLabel: nullableTrimmedString(60),
  notesTerms: nullableTrimmedString(5000),
  monthlyConsultationCredits: z.coerce.number().int().min(0).default(0),
  wellnessCreditsPerMonth: z.coerce.number().int().min(0).default(0),
  familyEnabled: z.boolean().default(false),
});
// NOTE: VAT removed from these plans (no vatMode/vatRatePct input). The service
// layer forces vatMode=EXEMPT on every write and checkout sets automaticTax=false.

export const adminPlanCreateBodySchema = planCreateBase;

export const adminPlanUpdateBodySchema = planCreateBase
  .omit({ countryId: true, slug: true, planType: true })
  .extend({ slug: planSlugSchema })
  .partial();

export const planReorderBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        displayOrder: z.coerce.number().int().min(0),
      }),
    )
    .min(1),
});

// ─── Consultation rules (§36.10/§36.11) ──────────────────────────────────────

const consultationRuleBase = z.object({
  serviceId: z.string().trim().min(1),
  isIncluded: z.boolean().default(false),
  usesCredits: z.boolean().default(false),
  creditsPerUse: z.coerce.number().int().min(1).default(1),
  discountMode: planDiscountModeSchema.default("NONE"),
  discountPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  fixedPriceCents: z.coerce.number().int().min(0).optional().nullable(),
  unlockAfterPaidMonths: z.coerce.number().int().min(0).default(0),
  familyUsable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const adminConsultationRuleBodySchema = consultationRuleBase
  .refine(
    (d) => d.discountMode !== "PERCENT" || (typeof d.discountPercent === "number" && d.discountPercent > 0),
    { message: "discountPercent (0-100) is required when discountMode is PERCENT", path: ["discountPercent"] },
  )
  .refine(
    (d) => d.discountMode !== "FIXED" || (typeof d.fixedPriceCents === "number" && d.fixedPriceCents >= 0),
    { message: "fixedPriceCents is required when discountMode is FIXED", path: ["fixedPriceCents"] },
  );

// ─── Perk rules (§36.13) ─────────────────────────────────────────────────────

export const adminPerkRuleBodySchema = z
  .object({
    perkKey: perkKeySchema,
    unlockMode: perkUnlockModeSchema.default("MONTH_1"),
    unlockAfterPaidMonths: z.coerce.number().int().min(0).optional().nullable(),
  })
  .refine(
    (d) =>
      d.unlockMode !== "AFTER_PAID_MONTHS" ||
      (typeof d.unlockAfterPaidMonths === "number" && d.unlockAfterPaidMonths >= 1),
    {
      message: "unlockAfterPaidMonths (>=1) is required when unlockMode is AFTER_PAID_MONTHS",
      path: ["unlockAfterPaidMonths"],
    },
  );

// ─── Health-test redemption rules (§11/§20) ──────────────────────────────────

export const adminHealthTestRuleBodySchema = z.object({
  healthTestId: z.string().trim().min(1),
  requiredWellnessCredits: z.coerce.number().int().min(1),
  unlockAfterPaidMonths: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// ─── Translations (§20) ──────────────────────────────────────────────────────

export const adminPlanTranslationBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  shortDescription: nullableTrimmedString(500),
  longDescription: nullableTrimmedString(5000),
  notesTerms: nullableTrimmedString(5000),
  // Public-card "Includes" bullets for this locale (display-only). Empty array
  // → card uses the auto-generated defaults.
  features: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .optional()
    .default([]),
});

// ─── Admin subscriptions view + adjust-credits (§36.15) ───────────────────────

export const adminSubscriptionsQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.enum(["INCOMPLETE", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED"]).optional(),
  ),
  planId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminAdjustCreditsBodySchema = z.object({
  kind: creditKindSchema,
  delta: z.coerce.number().int().refine((n) => n !== 0, { message: "delta must be non-zero" }),
  reason: z.enum(["ADJUSTMENT", "CLAWBACK"]).default("ADJUSTMENT"),
  /**
   * Mandatory free-text justification for this manual balance edit (§4). The
   * enum `reason` is the category; this is the human "why". Persisted to the
   * audit metadata so every override is explainable after the fact.
   */
  note: z.string().trim().min(8, "A reason of at least 8 characters is required").max(500),
  /** Client-supplied idempotency token → key `admin:{adminId}:{requestId}` (§36.15). */
  requestId: z.string().trim().min(1).max(120),
});

// ─── Param schemas ───────────────────────────────────────────────────────────

export const planIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const planServiceRuleParamsSchema = z.object({
  id: z.string().trim().min(1),
  serviceId: z.string().trim().min(1),
});
export const planPerkParamsSchema = z.object({
  id: z.string().trim().min(1),
  perkKey: perkKeySchema,
});
export const planHealthTestRuleParamsSchema = z.object({
  id: z.string().trim().min(1),
  healthTestId: z.string().trim().min(1),
});
export const planLocaleParamsSchema = z.object({
  id: z.string().trim().min(1),
  locale: localeCodeSchema,
});
export const planPreviewQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
});
export const subscriptionIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const perkGrantIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const perkGrantsQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? "PENDING" : v),
    z.enum(["PENDING", "APPROVED", "DENIED", "AUTO"]).default("PENDING"),
  ),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type AdminPlanCreateBody = z.infer<typeof adminPlanCreateBodySchema>;
export type AdminPlanUpdateBody = z.infer<typeof adminPlanUpdateBodySchema>;
export type AdminPlansQuery = z.infer<typeof adminPlansQuerySchema>;
export type AdminConsultationRuleBody = z.infer<typeof adminConsultationRuleBodySchema>;
export type AdminPerkRuleBody = z.infer<typeof adminPerkRuleBodySchema>;
export type AdminHealthTestRuleBody = z.infer<typeof adminHealthTestRuleBodySchema>;
export type AdminPlanTranslationBody = z.infer<typeof adminPlanTranslationBodySchema>;
export type AdminSubscriptionsQuery = z.infer<typeof adminSubscriptionsQuerySchema>;
export type AdminAdjustCreditsBody = z.infer<typeof adminAdjustCreditsBodySchema>;
export type PlanReorderBody = z.infer<typeof planReorderBodySchema>;
