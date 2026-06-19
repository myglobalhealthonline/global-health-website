import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; faqId: string }> },
) {
  const { id, faqId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/health-tests/${encodeURIComponent(id)}/faqs/${encodeURIComponent(faqId)}`,
    "PATCH",
  );
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; faqId: string }> },
) {
  const { id, faqId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/health-tests/${encodeURIComponent(id)}/faqs/${encodeURIComponent(faqId)}`,
    "DELETE",
  );
}
