import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Clear one alert with a mandatory reason. `type` is "status" | "clinic";
 *  anything else is rejected by the backend, not here. */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ email: string; type: string }> },
) {
  const { email, type } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/patients/${encodeURIComponent(email)}/alerts/${encodeURIComponent(
      type,
    )}/remove`,
    "POST",
  );
}
