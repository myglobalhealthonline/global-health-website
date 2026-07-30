import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

/** Admin: add a one-off slot to a doctor's calendar for a single date/time,
 *  independent of their recurring weekly windows. */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id: doctorId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();

  const upstream = await fetch(
    `${backend}/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots`,
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
