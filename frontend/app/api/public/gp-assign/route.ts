import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for POST /api/public/gp-assign. The same-day GP details
 * form calls this to resolve a concrete doctor + slot for the chosen language
 * and time, then adds that to the cart. The doctor is decided server-side
 * (priority window + fair rotation) — the client only relays the response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const bodyText = await request.text();
  const upstream = await fetch(`${backend}/api/public/gp-assign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
