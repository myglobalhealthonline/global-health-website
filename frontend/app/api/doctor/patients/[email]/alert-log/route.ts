import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Chart-visible history of the doctor-only alert banners. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ email: string }> },
) {
  const { email } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/patients/${encodeURIComponent(email)}/alert-log`,
    "GET",
  );
}
