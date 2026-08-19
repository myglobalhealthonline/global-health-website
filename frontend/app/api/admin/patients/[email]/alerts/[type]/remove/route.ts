import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/** Admin twin of the doctor alert removal — a note is required either way. */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ email: string; type: string }> },
) {
  const { email, type } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/patients/${encodeURIComponent(email)}/alerts/${encodeURIComponent(
      type,
    )}/remove`,
    "POST",
  );
}
