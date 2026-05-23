import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// RFC 6265 token rule for cookie names. Mirrors the filter used in
// `lib/admin/admin-api.ts` so a malformed legacy cookie (we briefly
// shipped one that stored a stub function body as a name) can't poison
// the upstream request — the backend rejects the whole Cookie header
// when one entry is malformed.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

function sanitizeCookieHeader(raw: string): string {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const eq = part.indexOf("=");
      if (eq < 1) return false;
      return VALID_COOKIE_NAME.test(part.slice(0, eq));
    })
    .join("; ");
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id } = await params;
  const cookieHeader = sanitizeCookieHeader(request.headers.get("cookie") ?? "");
  const body = await request.text();

  const upstream = await fetch(`${backend}/api/admin/orders/${id}/generate-meet-link`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: body || "{}",
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
