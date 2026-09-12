import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ email: string; countryCode: string }> },
) {
  const { email, countryCode } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/patients/${encodeURIComponent(email)}/country-tax-ids/${encodeURIComponent(countryCode)}`,
    "PUT",
  );
}
