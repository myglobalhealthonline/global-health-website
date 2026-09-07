import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

/**
 * Proxy for the admin invoice "View" button.
 *
 * next.config.ts proxies `/api/admin/invoices/:id/pdf` and `/resend` by name —
 * the rewrite list is explicit per path, with no wildcard for this prefix — so
 * `/view-link` reached Next itself and 404'd, and ViewInvoiceButton's catch
 * turned that into a button that silently did nothing. A route handler rather
 * than a third rewrite, per that file's own note: handlers work regardless of
 * rewrite matching in a given deploy.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  return forwardStream(
    request,
    `/api/admin/invoices/${encodeURIComponent(invoiceId)}/view-link`,
  );
}
