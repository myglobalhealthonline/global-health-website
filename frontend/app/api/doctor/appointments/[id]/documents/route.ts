import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

function backendPath(id: string) {
  return `/api/doctor/appointments/${encodeURIComponent(id)}/documents`;
}

/** List / upload appointment documents (patient uploads, etc.). */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return forwardToBackend(request, backendPath(id), "GET");
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const bodyBuffer = Buffer.from(await request.arrayBuffer());

  const upstream = await fetch(`${backend}${backendPath(id)}`, {
    method: "POST",
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "content-length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
