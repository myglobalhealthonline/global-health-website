import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ examId: string }> },
) {
  const { examId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/exams/${encodeURIComponent(examId)}`,
    "PATCH",
  );
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ examId: string }> },
) {
  const { examId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/exams/${encodeURIComponent(examId)}`,
    "DELETE",
  );
}
