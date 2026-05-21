import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { collectSetCookies, rewriteOutboundSetCookie } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the patient-self profile endpoints. The
 * backend's /api/account/profile is gated by `requireAuth` + a
 * role=PATIENT check; this proxy just forwards the cookie + body so
 * the browser doesn't have to talk cross-origin.
 */
async function proxy(request: NextRequest, method: "GET" | "PATCH") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  };
  if (method === "PATCH") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/account/profile`, init);
  } catch (err) {
    console.error("[account-profile-proxy] backend fetch failed", {
      method,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, message: "Backend is unavailable" },
      { status: 503 },
    );
  }

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
  for (const raw of collectSetCookies(upstream.headers)) {
    res.headers.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }
  return res;
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function PATCH(request: NextRequest) {
  return proxy(request, "PATCH");
}
