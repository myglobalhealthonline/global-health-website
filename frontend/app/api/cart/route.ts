import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { forwardSetCookies } from "@/lib/server/set-cookie";

export const dynamic = "force-dynamic";

const EMPTY_CART_RESPONSE = {
  ok: true,
  data: {
    id: "",
    countryCode: "",
    currencyCode: "",
    items: [],
    subtotalCents: 0,
    itemCount: 0,
    expiredHolds: 0,
  },
};

async function proxy(request: NextRequest, method: "GET" | "DELETE") {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/cart`, {
      method,
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
  } catch (err) {
    // Log so a backend outage isn't silently masked by the empty-cart
    // fallback below — without this, ops can't tell from frontend logs
    // that upstream went away.
    console.error("[cart-proxy] backend fetch failed", {
      method,
      backend,
      error: err instanceof Error ? err.message : String(err),
    });
    if (method === "GET") {
      return NextResponse.json(EMPTY_CART_RESPONSE);
    }
    return NextResponse.json(
      { ok: false, message: "Backend is unavailable" },
      { status: 503 },
    );
  }
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

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function DELETE(request: NextRequest) {
  return proxy(request, "DELETE");
}
