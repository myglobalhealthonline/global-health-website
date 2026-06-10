import { z } from "zod";

const MINUTES_IN_DAY = 24 * 60;

/**
 * Admin upsert payload for a service's fixed peak-hour pricing.
 *
 * Times are clinic-local minute-of-day. The window end is exclusive and must
 * be strictly after the start (no overnight / wrap-around windows in v1).
 * Prices are non-negative integer cents.
 */
export const peakPricingSchema = z
  .object({
    enabled: z.boolean(),
    peakStartMinute: z.coerce.number().int().min(0).max(MINUTES_IN_DAY - 1),
    peakEndMinute: z.coerce.number().int().min(1).max(MINUTES_IN_DAY),
    peakPriceCents: z.coerce.number().int().min(0),
    offPeakPriceCents: z.coerce.number().int().min(0),
    currencyCode: z
      .string()
      .trim()
      .length(3)
      .transform((s) => s.toUpperCase()),
  })
  .strict()
  .refine((d) => d.peakEndMinute > d.peakStartMinute, {
    message: "peakEndMinute must be greater than peakStartMinute",
    path: ["peakEndMinute"],
  });

export type PeakPricingInput = z.infer<typeof peakPricingSchema>;
