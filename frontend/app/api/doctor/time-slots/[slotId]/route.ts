import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ slotId: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { slotId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();

  const upstream = await fetch(`${backend}/api/doctor/time-slots/${slotId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: bodyText || undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
