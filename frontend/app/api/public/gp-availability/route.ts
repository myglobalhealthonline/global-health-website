import { NextRequest, NextResponse } from "next/server";
import { getGpAvailability } from "@/lib/content/get-gp-availability";

export const dynamic = "force-dynamic";

/**
 * Availability is per-request live data. `force-dynamic` already stops Next
 * from caching it, but nothing told the browser or an intermediary that — this
 * route re-serializes the result, so the backend's own `no-store` never
 * reaches the client. Header-only: status codes and body shape are unchanged.
 *
 * The body is deliberately NOT streamed through from the backend: the upstream
 * envelope is `{ok,message,data}` while this route emits `{ok,data}`,
 * `getGpAvailability` normalizes partial bodies, and upstream failures are
 * swallowed into a 200 with an empty result. Streaming would change both the
 * status codes and the body shape `SameDayBooking` depends on.
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

  if (!country || !language) {
    return NextResponse.json(
      { ok: false, message: "country and language are required" },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await getGpAvailability(country, language, days);
  return NextResponse.json({ ok: true, data: result }, { headers: NO_STORE });
}
