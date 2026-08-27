import { z } from "zod";
import { reviewUrlSchema } from "../modules/review-invites/review-destinations.js";

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
      reviewUrl: reviewUrlSchema("TRUSTPILOT").optional(),
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
      reviewUrl: reviewUrlSchema("DOCTIFY").optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  primaryProvider: z
    .enum(["TRUSTPILOT", "GOOGLE", "DOCTIFY"])
    .nullable()
    .optional(),
  destinations: z
    .array(
      z.object({
        countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((code) => code.toUpperCase()),
        sendReviewRequests: z.boolean().default(false),
        googleReviewUrl: reviewUrlSchema("GOOGLE"),
      }),
    )
    .max(30)
    .optional(),
}).superRefine((value, context) => {
  const seen = new Set<string>();
  for (const [index, destination] of (value.destinations ?? []).entries()) {
    if (seen.has(destination.countryCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate country destination",
        path: ["destinations", index, "countryCode"],
      });
    }
    seen.add(destination.countryCode);
  }
});

export type ReviewSettingsBody = z.infer<typeof reviewSettingsSchema>;
