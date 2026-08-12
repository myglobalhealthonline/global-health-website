import { apiRequest } from "@/lib/api/client";

export type ConsultationCountResponse = { total: number };

/**
 * Public fetcher for the global consultation counter (TRUST-METRIC-001):
 * the previous platform's historical total plus every appointment actually
 * completed on this platform since 2026-07-01. Cached server-side (1h
 * revalidate) + tagged so every page that shows the figure shares one
 * cached value instead of issuing its own DB hit.
 */
export async function fetchGlobalConsultationCount() {
  return apiRequest<ConsultationCountResponse>("/api/public/consultation-count", {
    revalidate: 3600,
    tags: ["consultation-count"],
  });
}
