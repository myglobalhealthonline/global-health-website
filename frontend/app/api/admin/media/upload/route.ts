import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for admin media uploads.
 *
 * The doctor profile-image picker and the asset path field POST multipart
 * file data here. We buffer the raw bytes and re-POST them to the backend
 * with the original Content-Type (boundary intact) + session cookie.
 *
 * Why buffer instead of streaming the body through:
 *   Earlier rev passed `body: request.body` with `duplex: "half"`. On
 *   Node's undici fetch, that path corrupts multipart payloads in some
 *   environments (image bytes arrive mangled, S3 stores a broken file,
 *   the preview is unreadable). Reading the body once as an ArrayBuffer
 *   and forwarding the bytes verbatim avoids the streaming chunked-
 *   encoding interaction entirely. Uploads are capped at 5MB by the
 *   backend so the memory hit is bounded.
 *
 * Why proxy instead of letting the browser hit the backend directly:
 * - Avoids cross-origin cookie issues on Railway subdomains.
 * - Removes the client-side `NEXT_PUBLIC_API_URL` dependency.
 */
export async function POST(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";

  // Buffer the multipart body — preserves the exact bytes (including
  // the boundary line breaks) so @fastify/multipart on the backend
  // parses the file cleanly.
  const bodyBuffer = Buffer.from(await request.arrayBuffer());

  const upstream = await fetch(`${backend}/api/admin/media/upload`, {
    method: "POST",
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "content-length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
