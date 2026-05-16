import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for `/api/payments/checkout-session`. The booking form
 * calls this client-side after a successful submit. On Railway the backend
 * sits on a different subdomain, so the auth cookie can't be sent cross-
 * origin (`.up.railway.app` is on the Public Suffix List). The proxy
 * forwards the session cookie server-side instead.
 */
export async function POST(request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const bodyText = await request.text();

  const upstream = await fetch(`${backend}/api/payments/checkout-session`, {
    method: "POST",
    headers: {
      "content-type": contentType,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
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
