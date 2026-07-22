import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for "clear this appointment's unread admin
 * notifications". Called by the Messages inbox when a thread is opened;
 * auth is enforced server-side by the backend route.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ appointmentId: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const { appointmentId } = await ctx.params;
  const cookie = request.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${backend}/api/admin/notifications/appointment/${encodeURIComponent(appointmentId)}/read`,
    {
      method: "POST",
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
