import { z } from "zod";
import { enrollmentEmailSchema, membershipIdSchema } from "./admin-membership-enrollments.schema.js";

/**
 * Zod contracts for the member-facing membership surface
 * (docs/plans/private-membership-plans-implementation.md §13.1, phase 3).
 *
 * The id and email schemas are the admin ones re-exported deliberately: the
 * claim compares what a member types against what an import wrote, so the two
 * edges must normalise identically. A second, subtly different definition here
 * would show up as a claim that "should" match and does not.
 */

export const membershipClaimSchema = z.object({
  membershipId: membershipIdSchema,
  email: enrollmentEmailSchema,
});
export type MembershipClaimBody = z.infer<typeof membershipClaimSchema>;

/**
 * 32 random bytes as base64url is 43 chars. Bounded on both sides so a
 * pathological body never reaches the hash.
 */
export const membershipClaimConfirmSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/, { message: "Malformed token" }),
});
export type MembershipClaimConfirmBody = z.infer<typeof membershipClaimConfirmSchema>;

/**
 * Member-added dependent (§10). No `membershipId`: the member does not get to
 * choose one — it is generated as `<primary>-D1`, `-D2`, … And no term dates:
 * a dependent inherits `startDate` / `endDate` from the primary (§3.4), so
 * accepting them here would be an editable copy of a value the API rejects.
 */
export const memberDependentCreateSchema = z.object({
  email: enrollmentEmailSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  relationship: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type MemberDependentCreateBody = z.infer<typeof memberDependentCreateSchema>;

/** Staff card lookup (§10). */
export const membershipVerifyQuerySchema = z.object({
  membershipId: membershipIdSchema,
});
