import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for admin media uploads.
 *
 * The doctor profile-image picker and the asset path field POST multipart
 * file data here. We forward the raw body + content-type to the backend's
 * `/api/admin/media/upload` endpoint along with the session cookie.
 *
 * Why proxy instead of letting the browser hit the backend directly:
 * - Avoids cross-origin cookie issues on Railway subdomains (the auth
 *   cookie lives on the frontend host, browsers won't send it to the
 *   backend host on a cross-site multipart POST).
 * - No need for the client to read `NEXT_PUBLIC_API_URL` — the upload
 *   path is just `/api/admin/media/upload` no matter where the backend
 *   actually lives.
 *
 * Stream the body straight through with `duplex: "half"` so we don't
 * buffer the whole file in Node memory.
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

  const upstream = await fetch(`${backend}/api/admin/media/upload`, {
    method: "POST",
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: request.body,
    // `duplex` is required when sending a streaming body in Node's fetch.
    // Cast keeps TypeScript happy until the lib catches up.
    ...({ duplex: "half" } as { duplex: "half" }),
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
