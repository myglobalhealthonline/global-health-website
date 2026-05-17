import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }

  const bodyText = await request.text();

  const upstream = await fetch(`${backend}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText || undefined,
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
