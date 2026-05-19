import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

type Params = Promise<{ key: string[] }>;

/**
 * Public media proxy. Forwards `/api/media/<...key>` from the Next.js
 * frontend to the Fastify backend `/api/media/<...key>` which streams
 * the object from S3-compatible storage.
 *
 * Caching: the backend stamps an immutable `Cache-Control` on every
 * media object (the key contains a UUID, so the bytes never change
 * for a given URL). We honour that here so:
 *   1. The fetch to the backend can be cached at Next's data-cache
 *      layer (default behaviour when `cache: "no-store"` isn't set).
 *   2. The response passes the upstream `Cache-Control` through to the
 *      browser + any edge in front of the frontend, letting them serve
 *      the bytes without round-tripping back to S3 every time.
 *
 * If a key is ever reused with different bytes, blow away the upstream
 * cache + the edge cache — there's no way to invalidate a baked-in
 * immutable header. Today the upload path always mints a fresh UUID,
 * so reuse isn't a real concern.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend not configured" },
      { status: 503 },
    );
  }
  const { key } = await params;
  const encoded = key.map(encodeURIComponent).join("/");
  // Honour the upstream's Cache-Control. Backend serves media with
  // `public, max-age=31536000, immutable`, so we don't want to bust
  // the cache on every proxy hop.
  const upstream = await fetch(`${backend}/api/media/${encoded}`, {
    method: "GET",
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Not found", {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        // Don't let an upstream 4xx/5xx body get cached at the edge.
        "cache-control": "no-store",
      },
    });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  // Fall back to a sensible long cache if the backend forgot the
  // header — keys are immutable by construction.
  const cacheControl =
    upstream.headers.get("cache-control") ??
    "public, max-age=31536000, immutable";
  headers.set("cache-control", cacheControl);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  });
}
