import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { revalidateDoctorProfileCacheFromApiText } from "@/lib/server/revalidate-doctor-profile";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the doctor self-edit per-country profile PATCH
 * (bio / registration / payout). Cookies don't traverse subdomains on
 * Railway so a direct browser → backend call would be unauthenticated —
 * forward via this route handler, mirroring /api/doctor/profile.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const { countryId } = await params;
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const body = await request.text();
  const upstream = await fetch(
    `${backend}/api/doctor/profile/markets/${encodeURIComponent(countryId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: body || undefined,
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  if (upstream.ok) {
    revalidateDoctorProfileCacheFromApiText(text);
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
