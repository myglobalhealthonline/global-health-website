import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Binary/multipart-safe same-origin proxy for Next route handlers.
 *
 * Unlike `forwardToBackend` (text-only), this:
 *   - forwards the query string (`request.nextUrl.search`),
 *   - preserves multipart uploads as raw bytes (file invoice upload), and
 *   - streams non-JSON responses (xls / pdf) straight through with their
 *     Content-Disposition — so report downloads aren't corrupted by a
 *     text round-trip and large files never get buffered whole in memory.
 *
 * Used by the report-export + payout-invoice endpoints so they never depend
 * on next.config rewrite matching in a given deploy.
 */
/** Report/invoice exports can involve slower backend rendering than a plain JSON call. */
const STREAM_TIMEOUT_MS = 30_000;

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
      signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      { ok: false, message: timedOut ? "Backend request timed out" : "Backend is unavailable" },
      { status: timedOut ? 504 : 503 },
    );
  }

  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";

  if (!upstreamContentType.includes("application/json")) {
    // Binary payload (xls/pdf) — stream straight through instead of
    // buffering the whole file into memory as an ArrayBuffer first.
    const res = new NextResponse(upstream.body, {
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
