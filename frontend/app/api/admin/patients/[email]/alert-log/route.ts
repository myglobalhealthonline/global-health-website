import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Admin twin of the doctor alert-log read — same rows, admin session. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ email: string }> },
) {
  const { email } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/patients/${encodeURIComponent(email)}/alert-log`,
    "GET",
  );
}
