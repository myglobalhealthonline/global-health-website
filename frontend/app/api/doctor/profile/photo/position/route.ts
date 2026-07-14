import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { revalidateDoctorProfileCacheFromApiText } from "@/lib/server/revalidate-doctor-profile";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the doctor's own focal-point/zoom adjustment on
 * their profile photo. Small JSON body — mirrors the photo upload/delete
 * proxies in ../route.ts (forward cookie, pass status/body straight through).
 */
export async function PATCH(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();

  const upstream = await fetch(`${backend}/api/doctor/profile/photo/position`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body,
    cache: "no-store",
  });
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
