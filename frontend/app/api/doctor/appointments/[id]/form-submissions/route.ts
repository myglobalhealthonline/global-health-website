import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/form-submissions`,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/doctor/appointments/${encodeURIComponent(id)}/form-submissions`,
    "POST",
  );
}
