import { z } from "zod";
import { COUPON_CODE_REGEX } from "../modules/coupons/coupon-code.js";

const localeSchema = z.enum(["EN", "PT", "ES", "CS", "RO", "DE"]);

const recipientSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().max(120).optional().nullable(),
  /** Null / omitted = resolve at send time from the account or country. */
  locale: localeSchema.optional().nullable(),
  /** Set when the admin picked an existing customer from the autocomplete. */
  patientProfileId: z.string().trim().max(64).optional().nullable(),
});

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  kind: z.enum(["PERSONAL", "GENERAL"]).optional(),
  status: z.enum(["active", "scheduled", "expired", "exhausted", "disabled"]).optional(),
});

export const couponIdParamSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const createCouponSchema = z
  .object({
    /** Omit to have one generated. */
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(COUPON_CODE_REGEX, "4–32 characters: letters, digits and hyphens")
      .optional(),
    kind: z.enum(["PERSONAL", "GENERAL"]),
    discountPercent: z.number().int().min(1).max(100),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
    maxRedemptions: z.number().int().min(1).max(100_000),
    personalEmail: z.string().trim().toLowerCase().email().optional(),
    personalName: z.string().trim().max(120).optional(),
    internalNote: z.string().trim().max(1000).optional(),
    recipients: z.array(recipientSchema).max(200).optional(),
    /** Send the coupon email(s) immediately after creation. */
    sendNow: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.validUntil) <= new Date(v.validFrom)) {
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "Must be after the start date" });
    }
    if (v.kind === "PERSONAL" && !v.personalEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["personalEmail"],
        message: "A personal coupon needs the person's email",
      });
    }
    if (v.kind === "GENERAL" && v.personalEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["personalEmail"],
        message: "A general coupon is not tied to one address",
      });
    }
    if (v.kind === "PERSONAL" && (v.recipients?.length ?? 0) > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["recipients"],
        message: "A personal coupon is emailed to the assigned person only",
      });
    }
  });

/**
 * `code`, `kind`, `discountPercent` and `personalEmail` are deliberately absent:
 * changing any of them under live redemptions rewrites what an already-taken
 * discount meant. Retire the coupon and mint a new one instead.
 *
 * The validity window IS editable, in both directions. Moving it does not
 * change what any past redemption was worth, and a mis-set start date has to be
 * correctable — a coupon whose window opens in the future answers "not valid
 * yet" and is otherwise unusable until it does.
 */
export const updateCouponSchema = z
  .object({
    active: z.boolean().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    maxRedemptions: z.number().int().min(1).max(100_000).optional(),
    internalNote: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const sendCouponEmailsSchema = z
  .object({
    recipients: z.array(recipientSchema).max(200).optional(),
    /** Resend to specific existing rows (the per-row Resend button). */
    recipientIds: z.array(z.string().trim().max(64)).max(200).optional(),
  })
  .refine(
    (v) => (v.recipients?.length ?? 0) > 0 || (v.recipientIds?.length ?? 0) > 0,
    "Add at least one recipient",
  );

export const adminValidateCouponSchema = z.object({
  code: z.string().trim().max(32),
  email: z.string().trim().toLowerCase().email().optional(),
  countryCode: z.string().trim().max(4).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CouponRecipientInput = z.infer<typeof recipientSchema>;
