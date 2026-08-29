import { z } from "zod";

export const bookingPauseReasonCodeSchema = z.enum([
  "LEAVE",
  "TEMPORARY_UNAVAILABLE",
  "OTHER",
]);

const utcInstantSchema = z
  .string()
  .trim()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

/**
 * Admin/doctor input for an operational booking pause. Public copy is resolved
 * from `reasonCode`; this endpoint deliberately does not accept free text.
 */
export const bookingPauseBodySchema = z
  .object({
    from: utcInstantSchema,
    until: utcInstantSchema.nullable(),
    reasonCode: bookingPauseReasonCodeSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.until && value.from.getTime() >= value.until.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["until"],
        message: "until must be after from",
      });
    }
  });

export type BookingPauseBody = z.infer<typeof bookingPauseBodySchema>;
