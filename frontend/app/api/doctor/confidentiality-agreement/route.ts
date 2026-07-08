import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the doctor confidentiality-agreement accept POST.
 * Cookies don't traverse subdomains on Railway, so the browser can't call
 * the backend directly — forward via this route handler.
 */
export async function POST() {
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
  const upstream = await fetch(`${backend}/api/doctor/confidentiality-agreement`, {
    method: "POST",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
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
