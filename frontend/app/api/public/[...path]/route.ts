import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { proxyClientIpHeaders } from "@/lib/server/proxy-client-ip";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for `/api/public/*` requests (brazil consent, review
 * rating form, patient file upload). Routing these through Next.js avoids
 * cross-origin fetch from the browser and removes the dependency on
 * NEXT_PUBLIC_API_URL being reachable from end-user browsers.
 *
 * Only the paths listed in ALLOWED_PATHS are forwarded — all others 404.
 */
const ALLOWED_PATHS: Record<string, Set<string>> = {
  GET: new Set([
    "brazil-consent",
    "reviews/rate",
    "patient-upload",
    "cross-border-rx-consent",
    // Coverage catalogue for the booking form's cover picker — names + ids of
    // admin-configured insurers / employers / membership + health plans.
    "coverage-catalog",
  ]),
  POST: new Set([
    "brazil-consent/submit",
    "reviews/rate",
    "patient-upload",
    "cross-border-rx-consent",
  ]),
};

function isAllowed(method: string, segments: string[]): boolean {
  const set = ALLOWED_PATHS[method];
  if (!set) return false;
  return set.has(segments.join("/"));
}

async function proxyPublic(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  if (segments.length === 0 || !isAllowed(request.method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const path = segments.join("/");
  const targetUrl = `${backend}/api/public/${path}${request.nextUrl.search}`;

  const contentType = request.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  const init: RequestInit = {
    method: request.method,
    headers: {
      // Forward content-type only for JSON bodies; let fetch set its own
      // boundary header for multipart/form-data.
      ...(!isFormData && contentType
        ? { "content-type": contentType }
        : {}),
      ...proxyClientIpHeaders(request),
    },
    cache: "no-store",
  };

  if (request.method !== "GET") {
    if (isFormData) {
      init.body = await request.formData();
    } else {
      const text = await request.text();
      if (text) init.body = text;
    }
  }

  const upstream = await fetch(targetUrl, init);
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxyPublic(request, path ?? []);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxyPublic(request, path ?? []);
}
