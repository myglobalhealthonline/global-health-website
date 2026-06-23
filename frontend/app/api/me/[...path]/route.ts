import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the patient `/api/me/*` subscription surface (Sprint 3).
 * The `gh_auth` cookie is scoped to the site host, so the browser sends it on
 * these same-origin calls; we forward to the backend Fastify origin server-side
 * with the cookie attached. Mirrors `/api/auth/[...path]`.
 *
 * Strict allow-list — only the patient subscription/credit/redemption routes
 * are forwardable; anything else 404s so the proxy can't reach unrelated paths.
 */
const ROUTE_TABLE: Record<string, Set<string>> = {
  GET: new Set([
    "subscription",
    "subscription/portal",
    "credits",
    "redemptions",
    "invoices",
    "cart-preview",
    "notifications",
  ]),
  POST: new Set([
    "subscription",
    "subscription/change",
    "subscription/cancel",
    "redemptions",
    "notifications/read-all",
  ]),
};

/** Dynamic (id-bearing) paths allowed per method, matched by pattern. */
const PATTERN_TABLE: Record<string, RegExp[]> = {
  PATCH: [/^notifications\/[^/]+\/read$/],
};

function isAllowed(method: string, segments: string[]): boolean {
  const joined = segments.join("/");
  const set = ROUTE_TABLE[method];
  if (set?.has(joined)) return true;
  return (PATTERN_TABLE[method] ?? []).some((re) => re.test(joined));
}

async function proxyMe(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  if (segments.length === 0 || !isAllowed(request.method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const path = segments.join("/");
  const targetUrl = `${backend}/api/me/${path}${request.nextUrl.search}`;
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
  if (request.method !== "GET") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  const upstream = await fetch(targetUrl, init);
  const bodyText = await upstream.text();
  return new NextResponse(bodyText, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyMe(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyMe(request, path ?? []);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyMe(request, path ?? []);
}
