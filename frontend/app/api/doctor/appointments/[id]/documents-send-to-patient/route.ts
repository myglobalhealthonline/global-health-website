import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Name a file and email it to the patient in one action.
 *
 * Multipart, so the body is buffered and re-sent rather than streamed — same
 * reason as the sibling `documents` upload proxy (Railway cross-subdomain
 * quirks with chunked request bodies).
 */
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

  const upstream = await fetch(
    `${backend}/api/doctor/appointments/${encodeURIComponent(id)}/documents/send-to-patient`,
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
