import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/** One support thread, from the admin side. Bumps this admin's read cursor. */
export async function GET(
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
    `${backend}/api/admin/support/threads/${encodeURIComponent(threadId)}`,
    {
      method: "GET",
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
