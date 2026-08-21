import { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the printable invoice's "Download PDF" action.
 *
 * The backend endpoint is public, so no session is required — this exists
 * because /api/** reaches the backend through route handlers, not next.config
 * rewrites, and because forwardStream preserves the Content-Disposition
 * filename instead of corrupting the bytes in a text round-trip.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await ctx.params;
  return forwardStream(
    request,
    `/api/public/invoices/${encodeURIComponent(invoiceId)}/pdf`,
  );
}
