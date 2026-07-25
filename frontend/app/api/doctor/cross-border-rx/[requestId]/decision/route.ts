import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

// Doctor B: accept / request-more-info / refuse a cross-border request.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/cross-border-rx/${encodeURIComponent(requestId)}/decision`,
    "POST",
  );
}
