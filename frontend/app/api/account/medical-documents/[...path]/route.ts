import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { collectSetCookies, rewriteOutboundSetCookie } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

const ALLOWED: Record<string, Set<string>> = {
  GET: new Set(["", "download"].map(() => "*")),
  POST: new Set(["*"]),
};

// Simpler: allowlist by pattern
function isAllowed(method: string, segments: string[]): boolean {
  if (method === "GET") {
    // base list: []
    // download: ["<id>", "download"]
    return (
      segments.length === 0 ||
      (segments.length === 2 && segments[1] === "download")
    );
  }
  if (method === "POST") {
    return segments.length === 0;
  }
  return false;
}

async function proxy(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  if (!isAllowed(request.method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const key = segments.join("/");
  const targetUrl = `${backend}/api/account/medical-documents${key ? `/${key}` : ""}${request.nextUrl.search}`;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";

  let body: ArrayBuffer | string | undefined;
  if (request.method !== "GET") {
    if (contentType.includes("multipart/form-data")) {
      body = await request.arrayBuffer();
    } else {
      const text = await request.text();
      if (text) body = text;
    }
  }

  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  if (contentType) headers["content-type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend is unavailable" }, { status: 503 });
  }

  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";

  if (!upstreamContentType.includes("application/json")) {
    const buffer = await upstream.arrayBuffer();
    const res = new NextResponse(buffer, {
      status: upstream.status,
      headers: {
        "content-type": upstreamContentType,
        "cache-control": upstream.headers.get("cache-control") ?? "private, no-store",
      },
    });
    const cd = upstream.headers.get("content-disposition");
    if (cd) res.headers.set("content-disposition", cd);
    return res;
  }

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstreamContentType },
  });
  for (const raw of collectSetCookies(upstream.headers)) {
    res.headers.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
