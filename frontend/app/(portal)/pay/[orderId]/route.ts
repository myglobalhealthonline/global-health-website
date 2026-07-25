import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

/**
 * Branded short pay link: `${SITE}/pay/{orderId}`. Sent over WhatsApp/email in
 * place of the ~200-char Stripe Checkout URL. Resolves the freshest live
 * session server-side (respecting the cancelled/paid guard) and 302-redirects
 * the browser straight to Stripe — or to the cancelled page when the order is
 * no longer payable.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { orderId } = await params;
  const backend = getBackendOrigin();
  const cancelledUrl = new URL(`/checkout/cancelled?orderId=${orderId}`, request.url);

  if (!backend) return NextResponse.redirect(cancelledUrl);

  try {
    const res = await fetch(`${backend}/api/orders/${orderId}/pay-url`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; data?: { url?: string | null; payable?: boolean } }
      | null;
    const url = json?.data?.url;
    if (res.ok && url) return NextResponse.redirect(url);
  } catch {
    // fall through to the cancelled page
  }
  return NextResponse.redirect(cancelledUrl);
}
