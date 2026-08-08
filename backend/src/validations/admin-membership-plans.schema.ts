import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

/**
 * Zod contracts for the private membership plans admin surface
 * (docs/plans/private-membership-plans-implementation.md §13.1).
 *
 * Shape validation only. Anything needing a DB lookup — the plan's country
 * owning the service, the commission-market block (§6.6), "levels can only be
 * deleted with zero enrollments" — lives in the service layer.
 */

/** Lowercase URL-safe slug, 2–60 chars (§13.1). */
export const membershipSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
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

const optionalCurrencyCode = z
  .string()
  .trim()
  .min(3)
  .max(8)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined || v === null ? null : v.toUpperCase()));

/** Consultations only (§18) — the other ServiceKind values are out of scope. */
export const membershipServiceKindSchema = z.enum(["GENERAL", "SPECIALIST"]);
export const membershipBenefitTypeSchema = z.enum(["ALLOWANCE", "PERCENT", "FIXED", "EXCLUDED"]);
export const membershipFallbackTypeSchema = z.enum(["NONE", "PERCENT", "FIXED"]);
export const membershipAllowancePoolSchema = z.enum(["SHARED", "PER_PERSON"]);

// ─── Plans ───────────────────────────────────────────────────────────────────

export const adminMembershipPlansQuerySchema = z.object({
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  includeInactive: z.preprocess((v) => {
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
});

const membershipPlanBase = z.object({
  countryId: z.string().trim().min(1),
  slug: membershipSlugSchema,
  name: z.string().trim().min(1).max(200),
  internalNotes: nullableTrimmedString(5000),
  isActive: z.boolean().default(true),
  // Payer metadata (§15). Recorded for ops; never charged, never invoiced,
  // never shown to a patient.
  payerName: nullableTrimmedString(200),
  payerEmail: z
    .string()
    .trim()
    .max(320)
    .email()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : (v ?? null))),
  payerPhone: nullableTrimmedString(60),
  payerAmountCents: z.coerce.number().int().min(0).optional().nullable(),
  payerCurrency: optionalCurrencyCode,
  payerNotes: nullableTrimmedString(5000),
});

export const adminMembershipPlanCreateBodySchema = membershipPlanBase;

/**
 * `countryId` is the PRIMARY country and is fixed at creation (§20) — coverage
 * is widened through the covered-countries endpoints, never by editing this.
 */
export const adminMembershipPlanUpdateBodySchema = membershipPlanBase
  .omit({ countryId: true })
  .partial();

export const membershipPlanIdParamsSchema = z.object({
  planId: z.string().trim().min(1),
});

export const membershipPlanLocaleParamsSchema = z.object({
  planId: z.string().trim().min(1),
  locale: localeCodeSchema,
});

/**
 * Add / remove a covered country (§26). The primary is fixed at creation and
 * refused here by the service, not by this schema — it needs the plan row.
 */
export const membershipPlanCountryBodySchema = z.object({
  countryId: z.string().trim().min(1),
});

export const membershipPlanCountryParamsSchema = z.object({
  planId: z.string().trim().min(1),
  countryId: z.string().trim().min(1),
});

export const membershipTranslationBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: nullableTrimmedString(5000),
});

// ─── Levels ──────────────────────────────────────────────────────────────────

const membershipLevelBase = z.object({
  slug: membershipSlugSchema,
  name: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  familyEnabled: z.boolean().default(false),
  maxDependents: z.coerce.number().int().min(0).max(20).default(0),
  allowancePool: membershipAllowancePoolSchema.default("PER_PERSON"),
  /**
   * The card's background (§24.2, decision 45). Same shape as the DB CHECK —
   * `^#[0-9a-fA-F]{6}$` — so an invalid value is a 400 rather than a constraint
   * violation surfacing as a 500. Null clears it back to the default face.
   *
   * Only the BACKGROUND is stored. The foreground, the muted label colour and
   * the chrome tint are all derived from it at render time, which is what stops
   * an admin producing white-on-pale whatever they pick.
   */
  cardBackgroundHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour, e.g. #0B3D2E")
    .nullable()
    .optional(),
});

/** maxDependents > 0 requires familyEnabled (§13.1). */
const dependentsNeedFamily = (d: { familyEnabled?: boolean; maxDependents?: number }) =>
  !d.maxDependents || d.familyEnabled === true;

export const adminMembershipLevelCreateBodySchema = membershipLevelBase.refine(
  dependentsNeedFamily,
  { message: "maxDependents requires familyEnabled", path: ["maxDependents"] },
);

// Partial update: the same rule is re-checked in the service against the merged
// row, because a request may raise maxDependents without resending familyEnabled.
export const adminMembershipLevelUpdateBodySchema = membershipLevelBase.partial();

export const membershipLevelIdParamsSchema = z.object({
  levelId: z.string().trim().min(1),
});

export const membershipLevelLocaleParamsSchema = z.object({
  levelId: z.string().trim().min(1),
  locale: localeCodeSchema,
});

// ─── Benefits ────────────────────────────────────────────────────────────────

const membershipBenefitBase = z.object({
  /**
   * Which covered country this row configures (§21.3). Omitted means the
   * plan's primary country, so every caller written before phase 7 keeps
   * behaving identically. An uncovered country is refused by the service.
   */
  countryId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  serviceKind: membershipServiceKindSchema.optional().nullable(),
  serviceId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  benefitType: membershipBenefitTypeSchema,
  allowanceCount: z.coerce.number().int().min(1).max(999).optional().nullable(),
  percentOff: z.coerce.number().gt(0).max(100).optional().nullable(),
  fixedPriceCents: z.coerce.number().int().min(0).optional().nullable(),
  fallbackType: membershipFallbackTypeSchema.default("NONE"),
  fallbackPercent: z.coerce.number().gt(0).max(100).optional().nullable(),
  fallbackFixedCents: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

type BenefitShape = z.infer<typeof membershipBenefitBase>;

/**
 * The §3.3 invariants, mirrored by CHECK constraints in the migration. Kept in
 * one place so the create and update schemas cannot drift apart.
 */
export function refineBenefit<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (d: BenefitShape) => (d.serviceKind != null) !== (d.serviceId != null),
      {
        message: "A benefit targets exactly one of serviceKind or serviceId",
        path: ["serviceKind"],
      },
    )
    .refine((d: BenefitShape) => d.benefitType !== "ALLOWANCE" || d.allowanceCount != null, {
      message: "An allowance benefit needs allowanceCount",
      path: ["allowanceCount"],
    })
    // §21.3, and a CHECK backs it. A service-scoped pool cannot be shared
    // across countries: `Service` rows are per-country and there is no
    // reliable mapping between a Czech service and its Irish counterpart.
    // Slug matching is the silent-failure mode the design rejected outright.
    .refine((d: BenefitShape) => d.benefitType !== "ALLOWANCE" || d.serviceKind != null, {
      message:
        "An allowance covers a service kind, not one service — a shared pool cannot be pinned to a single country's service",
      path: ["benefitType"],
    })
    .refine((d: BenefitShape) => d.benefitType !== "PERCENT" || d.percentOff != null, {
      message: "A percent benefit needs percentOff",
      path: ["percentOff"],
    })
    .refine((d: BenefitShape) => d.benefitType !== "FIXED" || d.fixedPriceCents != null, {
      message: "A fixed-price benefit needs fixedPriceCents",
      path: ["fixedPriceCents"],
    })
    .refine(
      (d: BenefitShape) => d.fallbackType === "NONE" || d.benefitType === "ALLOWANCE",
      {
        message: "A fallback only applies once an allowance is exhausted",
        path: ["fallbackType"],
      },
    )
    .refine((d: BenefitShape) => d.fallbackType !== "PERCENT" || d.fallbackPercent != null, {
      message: "A percent fallback needs fallbackPercent",
      path: ["fallbackPercent"],
    })
    .refine((d: BenefitShape) => d.fallbackType !== "FIXED" || d.fallbackFixedCents != null, {
      message: "A fixed fallback needs fallbackFixedCents",
      path: ["fallbackFixedCents"],
    });
}

export const adminMembershipBenefitCreateBodySchema = refineBenefit(membershipBenefitBase);

/**
 * Update sends the whole benefit row, not a patch. The invariants are
 * cross-field, so a partial body could never be validated without re-reading
 * the row and merging — and the level editor renders one form per row anyway.
 */
export const adminMembershipBenefitUpdateBodySchema = adminMembershipBenefitCreateBodySchema;

export const membershipBenefitIdParamsSchema = z.object({
  benefitId: z.string().trim().min(1),
});

export type AdminMembershipPlanCreateBody = z.infer<typeof adminMembershipPlanCreateBodySchema>;
export type AdminMembershipPlanUpdateBody = z.infer<typeof adminMembershipPlanUpdateBodySchema>;
export type AdminMembershipLevelCreateBody = z.infer<typeof adminMembershipLevelCreateBodySchema>;
export type AdminMembershipLevelUpdateBody = z.infer<typeof adminMembershipLevelUpdateBodySchema>;
export type AdminMembershipBenefitBody = z.infer<typeof adminMembershipBenefitCreateBodySchema>;
export type MembershipTranslationBody = z.infer<typeof membershipTranslationBodySchema>;
