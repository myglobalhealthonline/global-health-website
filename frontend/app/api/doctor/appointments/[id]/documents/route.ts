import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/documents`,
    "GET",
  );
}

/**
 * Multipart upload — buffer the bytes so the backend's
 * @fastify/multipart parser sees the boundary intact (same pattern as
 * admin media upload + doctor photo upload).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const upstream = await fetch(
    `${backend}/api/doctor/appointments/${encodeURIComponent(id)}/documents`,
    {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "content-length": String(bodyBuffer.length),
      },
      body: bodyBuffer,
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
