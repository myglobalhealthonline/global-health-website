import { z } from "zod";

/**
 * Zod contracts for patient-managed family members (§ appointment-claim G5).
 * A dependent the primary account holder can book consultations for under a
 * Premium family-enabled plan. `canUseCredits` is the "approved to use plan
 * benefits" gate (D5, self-service by default).
 */

/** Accepts a `YYYY-MM-DD` date or full ISO datetime; "" → omitted. */
const dobSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Invalid date of birth")
  .optional()
  .or(z.literal(""));

const emailSchema = z.string().trim().email().max(200).optional().or(z.literal(""));
const relationshipSchema = z.string().trim().max(60).optional().or(z.literal(""));

export const familyMemberCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  relationship: relationshipSchema,
  dateOfBirth: dobSchema,
  email: emailSchema,
  /** Approve this dependent to draw on the plan benefit (default false). */
  canUseCredits: z.boolean().optional(),
});

export const familyMemberUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    relationship: relationshipSchema,
    dateOfBirth: dobSchema,
    email: emailSchema,
    canUseCredits: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

export const familyMemberIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export type FamilyMemberCreateBody = z.infer<typeof familyMemberCreateSchema>;
export type FamilyMemberUpdateBody = z.infer<typeof familyMemberUpdateSchema>;
