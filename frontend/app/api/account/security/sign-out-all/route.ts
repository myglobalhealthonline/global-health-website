import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { forwardSetCookies } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for "sign out of all devices". Forwards to the
 * backend and relays its Set-Cookie (the backend clears the auth cookie
 * on success) so the browser drops the session for this device too.
 */
export async function POST(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const upstream = await fetch(`${backend}/api/account/security/sign-out-all`, {
    method: "POST",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  const bodyText = await upstream.text();
  const res = new NextResponse(bodyText, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
  forwardSetCookies(upstream.headers, res.headers);
  return res;
}
