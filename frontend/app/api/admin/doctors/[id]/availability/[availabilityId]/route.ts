import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function forward(
  request: NextRequest,
  id: string,
  availabilityId: string,
  method: "PATCH" | "DELETE",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  };
  if (method === "PATCH") {
    const body = await request.text();
    if (body) init.body = body;
  }
  const upstream = await fetch(
    `${backend}/api/admin/doctors/${encodeURIComponent(id)}/availability/${encodeURIComponent(availabilityId)}`,
    init,
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; availabilityId: string }> },
) {
  const { id, availabilityId } = await ctx.params;
  return forward(request, id, availabilityId, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; availabilityId: string }> },
) {
  const { id, availabilityId } = await ctx.params;
  return forward(request, id, availabilityId, "DELETE");
}
