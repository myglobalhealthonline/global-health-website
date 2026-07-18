import { z } from "zod";

const MINUTES_IN_DAY = 24 * 60;

/** One peak window: clinic-local minute-of-day, EXCLUSIVE end after the start. */
const peakWindowSchema = z
  .object({
    startMinute: z.coerce.number().int().min(0).max(MINUTES_IN_DAY - 1),
    endMinute: z.coerce.number().int().min(1).max(MINUTES_IN_DAY),
    /** Optional per-window price; null/absent → the shared peakPriceCents. */
    priceCents: z.coerce.number().int().min(0).nullish().default(null),
  })
  .strict()
  .refine((w) => w.endMinute > w.startMinute, {
    message: "Window end must be after its start",
    path: ["endMinute"],
  });

/**
 * Admin upsert payload for a service's fixed peak-hour pricing.
 *
 * One peak price applies across one or more clinic-local windows. Window ends
 * are exclusive and must be strictly after their start (no overnight wrap).
 * Prices are non-negative integer cents.
 */
export const peakPricingSchema = z
  .object({
    enabled: z.boolean(),
    peakPriceCents: z.coerce.number().int().min(0),
    offPeakPriceCents: z.coerce.number().int().min(0),
    currencyCode: z
      .string()
      .trim()
      .length(3)
      .transform((s) => s.toUpperCase()),
    windows: z.array(peakWindowSchema).max(12),
  })
  .strict()
  .refine((d) => !d.enabled || d.windows.length >= 1, {
    message: "Add at least one peak window",
    path: ["windows"],
  });

export type PeakPricingInput = z.infer<typeof peakPricingSchema>;
