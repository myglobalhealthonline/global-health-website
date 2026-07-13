import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

// Same-origin JSON proxy for the order-detail "Complete payment" CTA —
// mirrors ../../appointments/[id]/payment-url/route.ts. The underlying
// backend route (`/api/orders/:id/pay-url`) is intentionally unauthenticated
// (it also backs the branded `/pay/:id` WhatsApp/email short link and is
// keyed on the unguessable order CUID), so no cookie forwarding is required,
// but we proxy through the frontend origin anyway to keep the client fetch
// same-origin and consistent with every other account payment action.
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
    upstream = await fetch(`${backend}/api/orders/${encodeURIComponent(id)}/pay-url`, {
      method: "GET",
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
