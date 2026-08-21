import { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the membership invoice's "Download PDF" action.
 * forwardStream carries the session cookie through — the backend scopes the
 * document to the caller's own subscription — and preserves the
 * Content-Disposition filename instead of corrupting the bytes.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardStream(
    request,
    `/api/account/subscription-invoices/${encodeURIComponent(id)}/pdf`,
  );
}
