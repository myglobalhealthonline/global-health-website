import { z } from "zod";

/**
 * Admin test-center availability payloads. Mirrors the doctor availability
 * schemas in `routes/doctor-availability.route.ts` so the same admin week-grid
 * UI can drive either owner without a second payload shape.
 *
 * Minutes are center-local wall clock (`Country.bookingSetting.timezone`), not
 * UTC — see `resolveTestCenterTimeZone`.
 */

export const testCenterIdParamsSchema = z.object({
  id: z.string().min(1),
  /** The branch whose calendar is being edited. */
  locationId: z.string().min(1),
});

export const testCenterAvailabilityParamsSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().min(1),
  availabilityId: z.string().min(1),
});

export const adminTestCenterAvailabilityCreateBodySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 - 1),
    endMinute: z
      .number()
      .int()
      .min(1)
      .max(24 * 60),
    slotDurationMinutes: z.number().int().min(5).max(240).optional(),
    effectiveFrom: z.string().datetime().nullable().optional(),
    effectiveUntil: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((d) => d.endMinute > d.startMinute, {
    message: "endMinute must be greater than startMinute",
    path: ["endMinute"],
  });

export const adminTestCenterAvailabilityUpdateBodySchema = z
  .object({
    weekday: z.number().int().min(0).max(6).optional(),
    startMinute: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 - 1)
      .optional(),
    endMinute: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
    slotDurationMinutes: z.number().int().min(5).max(240).optional(),
    effectiveFrom: z.string().datetime().nullable().optional(),
    effectiveUntil: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine(
    (d) =>
      d.startMinute === undefined ||
      d.endMinute === undefined ||
      d.endMinute > d.startMinute,
    {
      message: "endMinute must be greater than startMinute",
      path: ["endMinute"],
    },
  );
