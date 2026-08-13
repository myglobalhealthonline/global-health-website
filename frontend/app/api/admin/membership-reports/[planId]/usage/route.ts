import type { NextRequest } from "next/server";
import { forwardStream } from "@/lib/server/proxy-stream";

export const dynamic = "force-dynamic";

/**
 * CSV export for the per-plan usage report (§15). Streamed rather than fetched
 * through the server-only client, because the browser is the consumer here —
 * this is the target of a download link, not a page render.
 *
 * Same endpoint and therefore the same query as the screen above it, so an
 * exported file and the report an admin is reading can never disagree.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const search = new URLSearchParams();
  for (const key of ["from", "to", "format"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) search.set(key, value);
  }
  if (!search.has("format")) search.set("format", "csv");
  return forwardStream(
    request,
    `/api/admin/membership-reports/${encodeURIComponent(planId)}/usage?${search.toString()}`,
  );
}
