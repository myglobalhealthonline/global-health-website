import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, method: "PATCH" | "DELETE") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const cookie = request.headers.get("cookie") ?? "";
  const body = method === "PATCH" ? await request.text() : undefined;
  const upstream = await fetch(`${backend}/api/doctor/booking-pause`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body } : {}),
    cache: "no-store",
  });
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(request: NextRequest) {
  return proxy(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return proxy(request, "DELETE");
}
