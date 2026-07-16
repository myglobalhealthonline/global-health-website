import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; slotId: string }>;

/** Admin block/unblock of one doctor slot. Mirrors the doctor-side
 *  /api/doctor/time-slots/[slotId] proxy; the backend runs the admin
 *  country-scope guard against the slot's owning doctor. */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id: doctorId, slotId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();

  const upstream = await fetch(
    `${backend}/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots/${encodeURIComponent(slotId)}`,
    {
      method: "PATCH",
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
