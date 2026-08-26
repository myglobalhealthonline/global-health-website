import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

/**
 * Branded short pay link: `${SITE}/pay/{token}`. Sent over WhatsApp/email in
 * place of the long Stripe Checkout URL. Resolves a signed pay capability
 * server-side and redirects to Stripe or the appropriate terminal-state page.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { orderId: payToken } = await params;
  const backend = getBackendOrigin();

  // Build redirects off the PUBLIC origin, not `request.url` — behind Railway's
  // proxy the latter is the internal bind address (0.0.0.0:8080), which produces
  // dead links. Prefer the forwarded host the browser actually used.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${proto}://${host}` : request.nextUrl.origin;
  const statusUrl = (state: "paid" | "expired" | "unknown") => `${base}/pay-status?state=${state}`;

  // Never guess: only say "paid" or "expired" when the backend confirms it.
  // Anything else (error, unreachable, indeterminate) → "unknown", so a paid
  // order is never mislabelled as expired on a transient hiccup.
  if (!backend) return NextResponse.redirect(statusUrl("unknown"));

  try {
    const res = await fetch(
      `${backend}/api/public/orders/pay/${encodeURIComponent(payToken)}`,
      { cache: "no-store" },
    );
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
