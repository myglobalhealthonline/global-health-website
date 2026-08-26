import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

// Same-origin JSON proxy for the order-detail "Complete payment" CTA. Unlike
// the public branded `/pay/{token}` link, this stays authenticated and scoped
// to the caller's own order id.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { id } = await params;

  let upstream: Response;
  try {
    const cookie = request.headers.get("cookie") ?? "";
    upstream = await fetch(`${backend}/api/account/orders/${encodeURIComponent(id)}/payment-url`, {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
