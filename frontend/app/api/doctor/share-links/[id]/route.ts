import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/share-links/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
