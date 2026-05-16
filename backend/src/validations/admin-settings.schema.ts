import { z } from "zod";

/** Aggregate snapshot for one provider — admin enters or fetcher refreshes. */
export const aggregateSchema = z
  .object({
    rating: z.coerce.number().min(0).max(5),
    count: z.coerce.number().int().min(0),
    updatedAt: z.string().optional(),
  })
  .nullable();

/**
 * Admin PATCH /api/admin/settings/reviews body.
 *
 * Every field is optional and `null` means "delete the underlying Setting
 * row" — see admin-settings.route.ts. This lets the admin form clear values
 * by submitting empty strings (the route layer maps "" → null).
 */
export const reviewSettingsSchema = z.object({
  trustpilot: z
    .object({
      businessUnitId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  google: z
    .object({
      placeId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  doctify: z
    .object({
      clinicId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  primaryProvider: z
    .enum(["TRUSTPILOT", "GOOGLE", "DOCTIFY"])
    .nullable()
    .optional(),
});

export type ReviewSettingsBody = z.infer<typeof reviewSettingsSchema>;
