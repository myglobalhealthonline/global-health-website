import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

// Doctor A: target countries + authorised prescriber doctors for a request.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/cross-border-rx/options`,
    "GET",
  );
}
