import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { collectSetCookies, rewriteOutboundSetCookie } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }

  const targetUrl = `${backend}/api/account/family`;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;

  let body: string | undefined;
  if (method === "POST") {
    const text = await request.text();
    if (text) {
      body = text;
      headers["content-type"] = "application/json";
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
  for (const raw of collectSetCookies(upstream.headers)) {
    res.headers.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }
  return res;
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}
export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}
