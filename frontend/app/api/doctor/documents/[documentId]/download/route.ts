import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin streaming proxy for clinical document downloads. The
 * backend refuses `/api/media/clinical/*` from the public route, so
 * doctor + admin both fetch via this gated path. Cookie is forwarded
 * verbatim; response is streamed back with the original Content-Type
 * + Content-Disposition headers so the browser renders / saves the
 * file like normal.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookie = request.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${backend}/api/doctor/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );

  // Non-2xx responses are JSON error envelopes; pass through as-is.
  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  // Stream the body back. Preserve content-type, disposition, and
  // cache-control so the file behaves correctly in the browser.
  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control"]) {
    const v = upstream.headers.get(name);
    if (v) headers.set(name, v);
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  });
}
