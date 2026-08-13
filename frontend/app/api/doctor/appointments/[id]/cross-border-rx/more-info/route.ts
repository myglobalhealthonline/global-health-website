import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

// Doctor A: read/answer Doctor B's "more information" question, in-portal
// on this appointment's own consultation tab.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/cross-border-rx/more-info`,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/cross-border-rx/more-info`,
    "POST",
  );
}
