import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the doctor self-edit profile PATCH. Cookies
 * don't traverse subdomains on Railway so any direct browser → backend
 * call would be unauthenticated — forward via this route handler.
 */
export async function PATCH(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const body = await request.text();
  const upstream = await fetch(`${backend}/api/doctor/profile`, {
    method: "PATCH",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
