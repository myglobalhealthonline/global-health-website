import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.arrayBuffer();

  const upstream = await fetch(
    `${backend}/api/doctor/appointments/${id}/chat/upload`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
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
