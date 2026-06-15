import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function forward(request: NextRequest, id: string) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();
  const upstream = await fetch(
    `${backend}/api/admin/appointments/${encodeURIComponent(id)}/update`,
    {
      method: "PATCH",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: body || undefined,
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

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forward(request, id);
}
