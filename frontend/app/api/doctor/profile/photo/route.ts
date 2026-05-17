import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for doctor self-upload profile photo. Mirrors the
 * admin upload proxy — buffers multipart bytes so the @fastify/multipart
 * parser on the backend sees the boundary intact, then forwards the
 * session cookie.
 */
export async function POST(request: NextRequest) {
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

  const upstream = await fetch(`${backend}/api/doctor/profile/photo`, {
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

export async function DELETE(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const upstream = await fetch(`${backend}/api/doctor/profile/photo`, {
    method: "DELETE",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
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
