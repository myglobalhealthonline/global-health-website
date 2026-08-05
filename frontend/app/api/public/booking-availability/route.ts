import { NextRequest, NextResponse } from "next/server";
import { getServiceDoctorAvailability } from "@/lib/content/get-doctor-availability";

export const dynamic = "force-dynamic";

/**
 * Same-origin endpoint for the home-page booking wizard's slot step. Reads
 * country/service/doctor and returns the public open slots (server-side fetch
 * → no CORS, no NEXT_PUBLIC_API_URL dependency in the browser). Reuses the
 * existing service-scoped availability fetcher.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  const service = searchParams.get("service")?.trim();
  const doctor = searchParams.get("doctor")?.trim();
  const daysRaw = Number(searchParams.get("days") ?? 14);
  const days = Math.min(120, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 14));

  if (!country || !service || !doctor) {
    return NextResponse.json(
      { ok: false, message: "country, service and doctor are required" },
      { status: 400 },
    );
  }

  const result = await getServiceDoctorAvailability(country, service, doctor, days);
  return NextResponse.json({ ok: true, data: result });
}
