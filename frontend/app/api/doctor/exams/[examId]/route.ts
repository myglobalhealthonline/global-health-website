import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ examId: string }> },
) {
  const { examId } = await ctx.params;
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookie = request.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${backend}/api/doctor/exams/${encodeURIComponent(examId)}`,
    {
      method: "DELETE",
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
