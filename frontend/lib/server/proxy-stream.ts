import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Binary/multipart-safe same-origin proxy for Next route handlers.
 *
 * Unlike `forwardToBackend` (text-only), this:
 *   - forwards the query string (`request.nextUrl.search`),
 *   - preserves multipart uploads as raw bytes (file invoice upload), and
 *   - streams non-JSON responses (xls / pdf) as an ArrayBuffer with their
 *     Content-Disposition — so report downloads aren't corrupted by a
 *     text round-trip.
 *
 * Used by the report-export + payout-invoice endpoints so they never depend
 * on next.config rewrite matching in a given deploy.
 */
export async function forwardStream(
  request: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  const targetUrl = `${backend}${backendPath}${request.nextUrl.search}`;
  const cookie = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";

  let body: ArrayBuffer | string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      body = await request.arrayBuffer();
    } else {
      const text = await request.text();
      if (text) body = text;
    }
  }

  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (contentType) headers["content-type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Backend is unavailable" },
      { status: 503 },
    );
  }

  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";

  if (!upstreamContentType.includes("application/json")) {
    const buffer = await upstream.arrayBuffer();
    const res = new NextResponse(buffer, {
      status: upstream.status,
      headers: {
        "content-type": upstreamContentType,
        "cache-control": upstream.headers.get("cache-control") ?? "private, no-store",
      },
    });
    const cd = upstream.headers.get("content-disposition");
    if (cd) res.headers.set("content-disposition", cd);
    return res;
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstreamContentType },
  });
}
