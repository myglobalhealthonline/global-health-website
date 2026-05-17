import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ consultationId: string }> },
) {
  const { consultationId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/consultations/${encodeURIComponent(consultationId)}/share-link`,
    "POST",
  );
}
