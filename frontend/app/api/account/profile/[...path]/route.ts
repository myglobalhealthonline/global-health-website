import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { collectSetCookies, rewriteOutboundSetCookie } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

const ALLOWED: Record<string, Set<string>> = {
  GET: new Set([
    "insurance",
    "verification",
    "id-document/download",
    "nationality",
    "nationality/1/download",
    "nationality/2/download",
  ]),
  PATCH: new Set(["insurance"]),
  POST: new Set([
    "insurance/document",
    "id-document",
    "nationality/1/upload",
    "nationality/2/upload",
  ]),
  PUT: new Set(["nationality/1", "nationality/2"]),
  DELETE: new Set(["nationality/1", "nationality/2"]),
};

async function proxy(request: NextRequest, segments: string[]) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }

  const key = segments.join("/");
  const allowed = ALLOWED[request.method];
  if (!allowed?.has(key)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const targetUrl = `${backend}/api/account/profile/${key}${request.nextUrl.search}`;

  let body: ArrayBuffer | string | undefined;
  if (request.method !== "GET" && request.method !== "DELETE") {
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
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path ?? []);
}
