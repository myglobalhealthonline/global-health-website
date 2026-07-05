import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { collectSetCookies, rewriteOutboundSetCookie } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the public corporate-invite endpoints. The accept
 * call sets the auth cookie (auto-login), so — like `/api/auth/*` — it must
 * hit the site host for the cookie to be scoped correctly. Only two shapes
 * are allowed:
 *   GET  /api/corporate/invites/:token
 *   POST /api/corporate/invites/:token/accept
 */
function isAllowed(method: string, segments: string[]): boolean {
  if (method === "GET") return segments.length === 1;
  if (method === "POST") return segments.length === 2 && segments[1] === "accept";
  return false;
}

async function proxyInvite(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  if (segments.length === 0 || !isAllowed(request.method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const targetUrl = `${backend}/api/corporate/invites/${segments
    .map(encodeURIComponent)
    .join("/")}`;
  const init: RequestInit = {
    method: request.method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
    },
    cache: "no-store",
  };
  if (request.method === "POST") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  const upstream = await fetch(targetUrl, init);
  const bodyText = await upstream.text();
  const res = new NextResponse(bodyText, {
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

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyInvite(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyInvite(request, path ?? []);
}
