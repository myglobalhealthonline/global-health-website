import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ availabilityId: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { availabilityId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();
  const upstream = await fetch(
    `${backend}/api/doctor/availability/${availabilityId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
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

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { availabilityId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${backend}/api/doctor/availability/${availabilityId}`,
    {
      method: "DELETE",
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
