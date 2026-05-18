import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ key: string[] }>;

/**
 * Public media proxy. Forwards `/api/media/<...key>` from the Next.js
 * frontend to the Fastify backend `/api/media/<...key>` which streams
 * the object from S3-compatible storage.
 *
 * Why a proxy instead of returning an absolute backend URL from upload
 * responses? Railway hosts the backend on a separate subdomain, so the
 * frontend uses a relative URL that the browser can resolve without
 * CORS hassle. The proxy also lets us cache aggressively at the edge
 * later without exposing the backend hostname.
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
  const upstream = await fetch(`${backend}/api/media/${encoded}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Not found", {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) headers.set("cache-control", cacheControl);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  });
}
