import { env } from "../../config/env.js";
import { upsertSetting, type AggregateSnapshot } from "./settings.service.js";

/**
 * Opportunistic Google Places refresher for the public review aggregate.
 *
 * - Only runs when `GOOGLE_PLACES_API_KEY` is configured and the Place ID
 *   has been set at /admin/settings.
 * - Refreshes at most once per `STALE_TTL_MS`; otherwise the admin-entered
 *   (or last-fetched) aggregate is used as-is.
 * - Failures are swallowed — the public reviews-config endpoint must never
 *   block on this third-party call. We just log and reuse the existing
 *   aggregate.
 *
 * Uses the Places API (New) `places.get` endpoint. Field mask is minimal
 * so we only pay for what we read.
 */

const STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isStale(aggregate: AggregateSnapshot | null): boolean {
  if (!aggregate) return true;
  const updated = Date.parse(aggregate.updatedAt);
  if (!Number.isFinite(updated)) return true;
  return Date.now() - updated > STALE_TTL_MS;
}

type PlacesApiResponse = {
  rating?: number;
  userRatingCount?: number;
};

async function fetchPlaceAggregate(placeId: string, apiKey: string): Promise<AggregateSnapshot | null> {
  // 5s budget — public reviews-config has its own 5min cache, but we still
  // don't want the admin-save round-trip to stall on a slow upstream.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "rating,userRatingCount",
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[google-places] non-200 (${response.status}) for placeId=${placeId}`);
      return null;
    }
    const data = (await response.json()) as PlacesApiResponse;
    if (typeof data.rating !== "number" || typeof data.userRatingCount !== "number") {
      return null;
    }
    return {
      rating: data.rating,
      count: data.userRatingCount,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[google-places] fetch failed for placeId=${placeId}:`, (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Refresh the Google aggregate in the background if the API key is set, a
 * Place ID is configured, and the cached aggregate is stale. Returns the
 * fresh snapshot if it was successfully refreshed, otherwise null (caller
 * keeps using whatever is already on disk).
 */
export async function maybeRefreshGoogleAggregate(
  placeId: string | null,
  currentAggregate: AggregateSnapshot | null,
): Promise<AggregateSnapshot | null> {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;
  if (!isStale(currentAggregate)) return null;

  const fresh = await fetchPlaceAggregate(placeId, apiKey);
  if (!fresh) return null;

  try {
    await upsertSetting("review.google.aggregate", fresh);
  } catch {
    // Persistence failure isn't fatal — return the fresh snapshot anyway
    // so this request gets the live data; next request will retry write.
  }
  return fresh;
}
