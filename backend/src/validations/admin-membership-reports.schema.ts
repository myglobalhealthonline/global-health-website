import { z } from "zod";

/**
 * `GET /api/admin/membership-reports/...` (§15/§32).
 *
 * The date range is optional at both ends — an open range is "everything so
 * far", which is what a partner asks for first. `format=csv` rides the same
 * usage endpoint rather than a second route, so the CSV and the screen can
 * never be built from different queries.
 */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();

export const membershipUsageParamsSchema = z.object({
  planId: z.string().trim().min(1).max(64),
});

export const membershipUsageQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    format: z.enum(["json", "csv"]).optional(),
  })
  .refine(
    (value) => !(value.from && value.to) || value.from <= value.to,
    { message: "`from` must not be after `to`", path: ["from"] },
  )
  .transform((value) => ({
    // Inclusive of the whole `to` day: an admin asking for 1–31 March means the
    // 31st's bookings too, and a bare date parses to that day's midnight.
    from: value.from ? new Date(`${value.from}T00:00:00.000Z`) : null,
    to: value.to ? new Date(`${value.to}T23:59:59.999Z`) : null,
    format: value.format ?? "json",
  }));

export const membershipEnrollmentUsageParamsSchema = z.object({
  enrollmentId: z.string().trim().min(1).max(64),
});

export type MembershipUsageQuery = z.infer<typeof membershipUsageQuerySchema>;
