import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

// Same-origin proxy so the httpOnly session cookie reaches the backend —
// same pattern as ../cancel/route.ts. GET fetches the reschedule-picker
// detail (doctor + current slot); PATCH commits the new slot.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/account/appointments/${encodeURIComponent(id)}/reschedule`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/account/appointments/${encodeURIComponent(id)}/reschedule`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: body || "{}",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
