import { NextRequest, NextResponse } from "next/server";
import { getGpAvailability } from "@/lib/content/get-gp-availability";

export const dynamic = "force-dynamic";

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
      { status: 400 },
    );
  }

  const result = await getGpAvailability(country, language, days);
  return NextResponse.json({ ok: true, data: result });
}
