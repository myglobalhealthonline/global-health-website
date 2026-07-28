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

  // Build redirects off the PUBLIC origin, not `request.url` — behind Railway's
  // proxy the latter is the internal bind address (0.0.0.0:8080), which produces
  // dead links. Prefer the forwarded host the browser actually used.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${proto}://${host}` : request.nextUrl.origin;
  const statusUrl = (state: "paid" | "expired" | "unknown") =>
    `${base}/pay-status?state=${state}&orderId=${encodeURIComponent(orderId)}`;

  // Never guess: only say "paid" or "expired" when the backend confirms it.
  // Anything else (error, unreachable, indeterminate) → "unknown", so a paid
  // order is never mislabelled as expired on a transient hiccup.
  if (!backend) return NextResponse.redirect(statusUrl("unknown"));

  try {
    const res = await fetch(`${backend}/api/orders/${orderId}/pay-url`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; data?: { url?: string | null; payable?: boolean; status?: string } }
      | null;
    const url = json?.data?.url;
    if (res.ok && url) return NextResponse.redirect(url); // still payable → Stripe
    const status = json?.data?.status;
    if (status === "PAID") return NextResponse.redirect(statusUrl("paid"));
    if (status === "CANCELLED") return NextResponse.redirect(statusUrl("expired"));
    return NextResponse.redirect(statusUrl("unknown"));
  } catch {
    return NextResponse.redirect(statusUrl("unknown"));
  }
}
