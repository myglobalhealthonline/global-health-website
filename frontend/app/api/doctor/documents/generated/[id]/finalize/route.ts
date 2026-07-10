import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/documents/generated/${encodeURIComponent(id)}/finalize`,
    "POST",
    // LibreOffice conversion can take up to SOFFICE_CONVERT_TIMEOUT_MS (45s) on the backend — stay above that.
    50_000,
  );
}
