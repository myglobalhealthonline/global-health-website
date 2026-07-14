import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { proxyClientIpHeaders } from "@/lib/server/proxy-client-ip";
import { forwardSetCookies } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();
  const locale =
    request.nextUrl.searchParams.get("locale") ?? request.cookies.get("gh_locale")?.value;
  const path = locale ? `/api/cart/items?locale=${encodeURIComponent(locale)}` : "/api/cart/items";
  const upstream = await fetch(`${backend}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...proxyClientIpHeaders(request),
    },
    body: bodyText || undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
  forwardSetCookies(upstream.headers, res.headers);
  return res;
}
