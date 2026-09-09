import { adminRequest } from "./core";

export type AdminReviewAggregate = { rating: number; count: number; updatedAt: string } | null;

export type ReviewAutomation = { enabled: boolean; activatedAt: string | null; delayHours: number; maxFollowups: number; followupIntervalDays: number };

export type AdminReviewSettings = {
  automation: ReviewAutomation;
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
    isActive: boolean;
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

export type ReviewActivityRow = {
  id: string; orderNumber: string | null; appointmentId: string | null; countryCode: string | null;
  nextSendAt: string | null; stoppedAt: string | null; stopReason: string | null; maxFollowups: number;
  deliveries: Array<{ id: string; stage: number; status: string; sentAt: string | null; error: string | null }>;
};
export async function fetchReviewActivity(query: string) {
  return adminRequest<{ rows: ReviewActivityRow[]; total: number; page: number; pageSize: number; counts: Record<string, number> }>(`/api/admin/settings/reviews/activity?${query}`);
}
export async function actOnReviewActivity(id: string, action: "stop" | "retry") {
  return adminRequest(`/api/admin/settings/reviews/activity/${encodeURIComponent(id)}/${action}`, { method: "POST" });
}
export type ReviewEmailPreview = { locale: string; reminder: boolean; subject: string; text: string; html: string };
export async function fetchReviewEmailPreviews() {
  return adminRequest<ReviewEmailPreview[]>("/api/admin/settings/reviews/preview");
}
