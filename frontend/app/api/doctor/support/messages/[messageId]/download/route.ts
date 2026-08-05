import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Streaming proxy for support-chat attachment downloads. A message's
 * `downloadUrl` is a bare `/api/doctor/...` path, so the click lands on the
 * frontend — this route exists so that path resolves instead of 404ing.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  const cookie = request.headers.get("cookie") ?? "";

  const upstream = await fetch(
    `${backend}/api/doctor/support/messages/${encodeURIComponent(messageId)}/download`,
    { method: "GET", headers: cookie ? { cookie } : {}, cache: "no-store" },
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control"]) {
    const v = upstream.headers.get(name);
    if (v) headers.set(name, v);
  }
  return new NextResponse(upstream.body, { status: 200, headers });
}
