import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

/** Admin: block / unblock / remove many of one doctor's slots at once, named
 *  either by UTC spans (a date range × a daily time range) or by slot ids. */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id: doctorId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();

  const upstream = await fetch(
    `${backend}/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots/bulk`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: bodyText || undefined,
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
