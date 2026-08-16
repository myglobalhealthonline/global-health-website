import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { proxyClientIpHeaders } from "@/lib/server/proxy-client-ip";

export const dynamic = "force-dynamic";

const ME_PROXY_TIMEOUT_MS = 20_000;

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
    // `benefit-preview` was retired in phase 5 (§6.3): `benefit-options` prices
    // all four benefit sources, and keeping both would have meant two price
    // sources for the same booking.
    "benefit-options",
    "notifications",
    // Private membership plans (§10). Reads normally happen server-side via
    // me-memberships-server.ts, but the claim-confirm page refreshes through
    // the client after linking, so the list has to be reachable here too.
    "memberships",
  ]),
  POST: new Set([
    "subscription",
    "subscription/change",
    "subscription/cancel-change",
    "subscription/cancel",
    "subscription/dev-activate",
    "redemptions",
    "notifications/read-all",
    // Two-step membership claim (§5.3). `claim` mails the confirmation link;
    // `claim/confirm` is what the link's landing page posts.
    "memberships/claim",
    "memberships/claim/confirm",
  ]),
};

/** Dynamic (id-bearing) paths allowed per method, matched by pattern. */
const PATTERN_TABLE: Record<string, RegExp[]> = {
  // The card PNG is a download, so it goes through the browser rather than
  // `fetch` — without it here the anchor got this proxy's JSON 404 and Chrome
  // saved "card.json".
  GET: [/^memberships\/[^/]+$/, /^memberships\/[^/]+\/card\.png$/],
  POST: [/^memberships\/[^/]+\/dependents$/],
  DELETE: [/^memberships\/dependents\/[^/]+$/],
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
      ...proxyClientIpHeaders(request),
    },
    cache: "no-store",
  };
  if (request.method !== "GET") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  // P-017: no upstream deadline previously — a hung backend fetch blocked
  // this proxy indefinitely. Streams the body through (same pattern as
  // /api/auth/[...path]) instead of buffering with .text() first.
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { ...init, signal: AbortSignal.timeout(ME_PROXY_TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      { ok: false, message: timedOut ? "Upstream request timed out" : "Upstream request failed" },
      { status: timedOut ? 504 : 503 },
    );
  }
  const disposition = upstream.headers.get("content-disposition");
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      // Carries the card's filename through to the browser's save dialog.
      ...(disposition ? { "content-disposition": disposition } : {}),
    },
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

/** Added for member-removed dependents (§10) — the first DELETE on this proxy. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyMe(request, path ?? []);
}
