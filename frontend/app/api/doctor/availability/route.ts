import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const target = `${backend}/api/doctor/availability${qs ? `?${qs}` : ""}`;
  const bodyText = method === "POST" ? await request.text() : undefined;

  const upstream = await fetch(target, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(bodyText !== undefined ? { body: bodyText } : {}),
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxy(request, "POST");
}
