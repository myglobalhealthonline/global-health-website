import { z } from "zod";

/**
 * Zod contracts for the membership enrollment admin surface
 * (docs/plans/private-membership-plans-implementation.md §13.1, phase 2).
 *
 * Shape only. Everything needing a lookup — the plan's level set, family caps,
 * global membership-id uniqueness, the (plan, email) collision — lives in
 * `membership-enrollments.service.ts`, next to the raw-SQL indexes that back it.
 */

/**
 * Partner-supplied, printable ASCII, 3–64 chars (§13.1). Stored verbatim and
 * compared case-insensitively — the uniqueness index is on `lower()`, so
 * `ABC1` and `abc1` are the same id even though PostgreSQL's plain unique
 * would treat them as two.
 */
export const membershipIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[\x20-\x7E]+$/, { message: "Membership ID must be printable ASCII" });

/** Lowercased + trimmed at the edge: it is the linking key (§ assumption 5). */
export const enrollmentEmailSchema = z
  .string()
  .trim()
  .max(320)
  .email()
  .transform((v) => v.toLowerCase());

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

/** Accepts a date or an ISO/`YYYY-MM-DD` string; blank means "not set". */
const nullableDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional(),
);

const requiredDate = z.coerce.date();

export const membershipEnrollmentStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "REMOVED",
]);

export const adminMembershipEnrollmentsQuerySchema = z.object({
  planId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    membershipEnrollmentStatusSchema.optional(),
  ),
  q: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().max(200).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  // Clamped rather than rejected, matching adminServicesQuerySchema — a caller
  // asking for "all" gets the cap instead of a 400 and an empty table.
  pageSize: z.coerce.number().int().min(1).default(25).transform((n) => Math.min(n, 100)),
});

const enrollmentPersonBase = z.object({
  membershipId: membershipIdSchema,
  email: enrollmentEmailSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: nullableTrimmed(60),
  dateOfBirth: nullableDate,
  adminNotes: nullableTrimmed(5000),
});

const termDatesOrdered = (d: { startDate?: Date; endDate?: Date | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;

export const adminMembershipEnrollmentCreateBodySchema = enrollmentPersonBase
  .extend({
    planId: z.string().trim().min(1),
    /** Omitted → the plan's default level (§3.2). */
    levelId: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.string().trim().min(1).optional(),
    ),
    startDate: requiredDate,
    endDate: nullableDate,
  })
  .refine(termDatesOrdered, { message: "endDate must not precede startDate", path: ["endDate"] });

/**
 * `planId` is immutable — moving a member between plans would carry their
 * membership id and any future allowance balances with them. Remove and
 * re-enroll instead.
 */
export const adminMembershipEnrollmentUpdateBodySchema = enrollmentPersonBase
  .extend({
    levelId: z.string().trim().min(1).optional(),
    startDate: requiredDate.optional(),
    endDate: nullableDate,
  })
  .partial()
  .refine(termDatesOrdered, { message: "endDate must not precede startDate", path: ["endDate"] });

/**
 * A dependent inherits plan, level, country and term from its primary (§3.4),
 * so none of those are accepted here. `membershipId` is optional: left out, the
 * service generates `<primaryMembershipId>-D1`, `-D2`, … .
 */
export const adminMembershipDependentCreateBodySchema = z.object({
  membershipId: membershipIdSchema.optional(),
  email: enrollmentEmailSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: nullableTrimmed(60),
  dateOfBirth: nullableDate,
  relationship: nullableTrimmed(60),
  adminNotes: nullableTrimmed(5000),
});

/** Suspension keeps the row and its history; the note says why. */
export const adminMembershipSuspendBodySchema = z.object({
  reason: nullableTrimmed(1000),
});

export const membershipEnrollmentIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type AdminMembershipEnrollmentsQuery = z.infer<
  typeof adminMembershipEnrollmentsQuerySchema
>;
export type AdminMembershipEnrollmentCreateBody = z.infer<
  typeof adminMembershipEnrollmentCreateBodySchema
>;
export type AdminMembershipEnrollmentUpdateBody = z.infer<
  typeof adminMembershipEnrollmentUpdateBodySchema
>;
export type AdminMembershipDependentCreateBody = z.infer<
  typeof adminMembershipDependentCreateBodySchema
>;
