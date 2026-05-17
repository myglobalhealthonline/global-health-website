import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/form-templates/${encodeURIComponent(templateId)}`,
    "PATCH",
  );
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/form-templates/${encodeURIComponent(templateId)}`,
    "DELETE",
  );
}
