import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, method: "GET" | "DELETE") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const upstream = await fetch(`${backend}/api/cart`, {
    method,
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  const text = await upstream.text();
  const setCookie = upstream.headers.get("set-cookie");
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      ...(setCookie ? { "set-cookie": setCookie } : {}),
    },
  });
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function DELETE(request: NextRequest) {
  return proxy(request, "DELETE");
}
