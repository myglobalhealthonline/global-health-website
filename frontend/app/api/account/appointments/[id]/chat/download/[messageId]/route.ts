import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin streaming proxy for consultation-chat attachment downloads.
 * The chat message's `downloadUrl` is a bare `/api/account/...` path (no
 * origin), so clicking it hits the frontend — this route exists so that
 * path actually resolves instead of 404ing on Next's own router.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookie = request.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${backend}/api/account/appointments/${encodeURIComponent(id)}/chat/download/${encodeURIComponent(messageId)}`,
    {
      method: "GET",
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );

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
