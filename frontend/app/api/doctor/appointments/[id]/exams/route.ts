import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function forward(
  request: NextRequest,
  id: string,
  method: "GET" | "POST",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookie = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  };
  if (method === "POST") {
    const body = await request.text();
    if (body) init.body = body;
  }
  const upstream = await fetch(
    `${backend}/api/doctor/appointments/${encodeURIComponent(id)}/exams`,
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

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forward(request, id, "GET");
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forward(request, id, "POST");
}
