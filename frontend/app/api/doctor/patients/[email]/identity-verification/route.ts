import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ email: string }> },
) {
  const { email } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/patients/${encodeURIComponent(email)}/identity-verification`,
    "GET",
  );
}
