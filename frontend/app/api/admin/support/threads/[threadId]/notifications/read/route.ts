import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/** Clears this admin's SUPPORT_MESSAGE bells for one thread. Without it the
 *  admin bell count only grows — opening a thread bumps the read cursor but
 *  leaves the Notification rows unread. */
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

  const upstream = await fetch(
    `${backend}/api/admin/support/threads/${encodeURIComponent(threadId)}/notifications/read`,
    {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
