import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

const ALLOWED_SEGMENTS = new Set([
  "login",
  "logout",
  "register",
  "me",
  "forgot-password",
  "reset-password",
]);

function rewriteOutboundSetCookie(headerValue: string): string {
  return headerValue.replace(/;\s*Domain=[^;]*/gi, "").trim();
}

function collectSetCookies(headers: Headers): string[] {
  const getter = headers.getSetCookie?.bind(headers);
  if (getter) return getter();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function proxyAuth(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }

  if (segments.length !== 1 || !ALLOWED_SEGMENTS.has(segments[0])) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const key = segments[0];
  const expectedMethod = key === "me" ? "GET" : "POST";
  if (request.method !== expectedMethod) {
    return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
  }

  const targetUrl = `${backend}/api/auth/${key}${request.nextUrl.search}`;
  const cookieHeader = request.headers.get("cookie") ?? "";

  const init: RequestInit = {
    method: request.method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  };

  if (expectedMethod === "POST") {
    const bodyText = await request.text();
    if (bodyText) init.body = bodyText;
  }

  const upstream = await fetch(targetUrl, init);
  const bodyText = await upstream.text();

  const res = new NextResponse(bodyText, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });

  for (const raw of collectSetCookies(upstream.headers)) {
    res.headers.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }

  return res;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAuth(request, path ?? []);
}
