import { apiRequest } from "@/lib/api/client";

export type AggregateSnapshot = {
  rating: number;
  count: number;
  updatedAt: string;
};

export type ReviewConfig = {
  trustpilot: { businessUnitId: string | null; aggregate: AggregateSnapshot | null };
  google: { placeId: string | null; aggregate: AggregateSnapshot | null };
  doctify: { clinicId: string | null; aggregate: AggregateSnapshot | null };
  primaryProvider: "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null;
};

/** Public fetcher for the review-provider config. Cached server-side
 *  (5 min revalidate) + tagged so admin saves invalidate immediately. */
export async function fetchPublicReviewConfig() {
  return apiRequest<ReviewConfig>("/api/public/reviews-config", {
    revalidate: 300,
    tags: ["reviews-config"],
  });
}

/** Pick the aggregate for whichever provider admin has marked
 *  `primaryProvider` — the single source of truth for the site-wide
 *  `AggregateRating` JSON-LD (structured-data.ts). `null` when no primary
 *  provider is configured or that provider has no aggregate saved yet. */
export function resolvePrimaryAggregate(config: ReviewConfig | null): AggregateSnapshot | null {
  if (!config) return null;
  switch (config.primaryProvider) {
    case "TRUSTPILOT":
      return config.trustpilot.aggregate;
    case "GOOGLE":
      return config.google.aggregate;
    case "DOCTIFY":
      return config.doctify.aggregate;
    default:
      return null;
  }
}
