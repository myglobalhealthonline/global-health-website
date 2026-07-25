import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

// Doctor A: create the cross-border request (mints the async-fee payment link).
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/cross-border-rx`,
    "POST",
  );
}
