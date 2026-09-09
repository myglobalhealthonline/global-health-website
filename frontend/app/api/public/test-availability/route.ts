import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin endpoint for the Book a Test slot picker.
 *
 * Server-side fetch, so the browser needs no CORS allowance and no
 * NEXT_PUBLIC_API_URL. The backend re-resolves the (exam, centre) pair and
 * applies every publication gate, so this handler deliberately does no
 * filtering of its own — it only forwards.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  const test = searchParams.get("test")?.trim();
  const centre = searchParams.get("centre")?.trim();
  const location = searchParams.get("location")?.trim();
  const daysRaw = Number(searchParams.get("days") ?? 14);
  const days = Math.min(60, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 14));

  if (!country || !test || !centre || !location) {
    return NextResponse.json(
      { ok: false, message: "country, test, centre and location are required" },
      { status: 400 },
    );
  }

  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  const url =
    `${backend}/api/tests/${encodeURIComponent(country)}` +
    `/${encodeURIComponent(test)}/centres/${encodeURIComponent(centre)}` +
    `/locations/${encodeURIComponent(location)}/availability?days=${days}`;

  try {
    // no-store: slot inventory is the one public read that must never be
    // served stale — a cached "open" slot the claim then rejects reads to the
    // patient as the site losing their booking.
    const upstream = await fetch(url, { cache: "no-store" });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Availability is temporarily unavailable" },
      { status: 503 },
    );
  }
}
