import { adminRequest } from "./core";

export type AdminReviewAggregate = { rating: number; count: number; updatedAt: string } | null;

export type AdminReviewSettings = {
  trustpilot: {
    businessUnitId: string | null;
    reviewUrl: string | null;
    aggregate: AdminReviewAggregate;
  };
  google: { placeId: string | null; aggregate: AdminReviewAggregate };
  doctify: {
    clinicId: string | null;
    reviewUrl: string | null;
    aggregate: AdminReviewAggregate;
  };
  primaryProvider: "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null;
  destinations: Array<{
    countryCode: string;
    countryName: string;
    sendReviewRequests: boolean;
    googleReviewUrl: string | null;
  }>;
};

/** GET/PATCH the review-provider config (Settings table). Drives the
 *  Doctify widget's on-page numbers AND (when primaryProvider + its
 *  aggregate are both set) the site-wide AggregateRating JSON-LD — see
 *  lib/seo/structured-data.ts's aggregateRatingJsonLd. */
export async function fetchAdminReviewSettings() {
  return adminRequest<AdminReviewSettings>("/api/admin/settings/reviews");
}

export async function patchAdminReviewSettings(body: unknown) {
  return adminRequest<AdminReviewSettings>("/api/admin/settings/reviews", {
    method: "PATCH",
    body,
  });
}
