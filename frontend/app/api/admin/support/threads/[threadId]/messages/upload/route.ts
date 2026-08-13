import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Multipart pass-through for admin support attachments.
 *
 * Forwards the raw body via `arrayBuffer()` — reading it as text would corrupt
 * binary payloads and destroy the multipart boundary.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.arrayBuffer();

  const upstream = await fetch(
    `${backend}/api/admin/support/threads/${encodeURIComponent(threadId)}/messages/upload`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body,
      cache: "no-store",
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
