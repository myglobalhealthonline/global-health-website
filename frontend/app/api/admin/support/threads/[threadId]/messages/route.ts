import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/** Admin replies into a doctor's support thread. */
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
  const bodyText = await request.text();

  const upstream = await fetch(
    `${backend}/api/admin/support/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: bodyText,
      cache: "no-store",
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
