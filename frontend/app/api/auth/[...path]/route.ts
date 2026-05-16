import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for `/api/auth/*` requests. The session cookie is
 * scoped to the site host so the browser sends it on these calls; we
 * forward to the backend's Fastify origin server-side and rewrite any
 * `Set-Cookie` headers on the way back (stripping `Domain=` so the cookie
 * sticks to the proxy host).
 *
 * Each (METHOD, path) pair must be explicitly listed in `ROUTE_TABLE`.
 * Anything not listed returns 404 — this keeps the proxy from forwarding
 * unexpected admin / internal paths even if the backend were to add them.
 */
const ROUTE_TABLE: Record<string, Set<string>> = {
  GET: new Set([
    "me",
    "me/export",
  ]),
  POST: new Set([
    "login",
    "logout",
    "register",
    "forgot-password",
    "reset-password",
    "change-password",
    "verify-email",
    "resend-verification",
  ]),
  PATCH: new Set([
    "me",
  ]),
  DELETE: new Set([
    "me",
  ]),
};

function isAllowed(method: string, segments: string[]): boolean {
  const set = ROUTE_TABLE[method];
  if (!set) return false;
  const key = segments.join("/");
  return set.has(key);
}

function rewriteOutboundSetCookie(headerValue: string): string {
  return headerValue.replace(/;\s*Domain=[^;]*/gi, "").trim();
}

function collectSetCookies(headers: Headers): string[] {
  const getter = headers.getSetCookie?.bind(headers);
  if (getter) return getter();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function proxyAuth(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }

  if (segments.length === 0 || !isAllowed(request.method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const path = segments.join("/");
  const targetUrl = `${backend}/api/auth/${path}${request.nextUrl.search}`;
  const cookieHeader = request.headers.get("cookie") ?? "";

  const init: RequestInit = {
    method: request.method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  };

  // GET + DELETE have no body. Everything else (POST + PATCH) forwards
  // the raw request body so JSON validation upstream sees exactly what
  // the client sent.
  if (request.method !== "GET" && request.method !== "DELETE") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  const upstream = await fetch(targetUrl, init);
  const bodyText = await upstream.text();

  const res = new NextResponse(bodyText, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      // Preserve attachment headers from /me/export so the download flow works.
      ...(upstream.headers.get("content-disposition")
        ? { "content-disposition": upstream.headers.get("content-disposition")! }
        : {}),
    },
  });

  for (const raw of collectSetCookies(upstream.headers)) {
    res.headers.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }

  return res;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}
