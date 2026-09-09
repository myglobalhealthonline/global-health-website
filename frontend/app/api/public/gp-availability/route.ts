import { NextRequest, NextResponse } from "next/server";
import { getGpAvailability } from "@/lib/content/get-gp-availability";
import { jsonAvailabilityResponse } from "@/lib/server/json-availability-response";

export const dynamic = "force-dynamic";

/**
 * Availability is per-request live data. `force-dynamic` already stops Next
 * from caching it, but nothing told the browser or an intermediary that — this
 * route re-serializes the result, so the backend's own `no-store` never
 * reaches the client. Header-only: status codes and body shape are unchanged.
 *
 * The body is deliberately NOT streamed through from the backend: the upstream
 * envelope is `{ok,message,data}` while this route emits `{ok,data}`,
 * `getGpAvailability` normalizes a successful body. Upstream failures become
 * a retryable 503 so the UI never mistakes an outage for no open times.
 */
const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Same-origin endpoint for the homepage same-day GP quick-book.
 * Returns aggregated open times for a country + consultation language
 * (server-proxied so the browser needs no CORS / backend URL).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  const language = searchParams.get("language")?.trim();
  const daysRaw = Number(searchParams.get("days") ?? 14);
  const days = Math.min(30, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 14));
  const clinicDays = searchParams.get("clinicDays") === "1";

  if (!country || !language) {
    return NextResponse.json(
      { ok: false, message: "country and language are required" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await getGpAvailability(country, language, days, clinicDays);
    return jsonAvailabilityResponse(request, { ok: true, data: result }, NO_STORE);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Appointment availability is temporarily unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
