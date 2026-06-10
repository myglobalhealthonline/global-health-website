import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; serviceDoctorId: string }> },
) {
  const { id, serviceDoctorId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/doctors/${encodeURIComponent(id)}/services/${encodeURIComponent(serviceDoctorId)}`,
    "PATCH",
  );
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; serviceDoctorId: string }> },
) {
  const { id, serviceDoctorId } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/doctors/${encodeURIComponent(id)}/services/${encodeURIComponent(serviceDoctorId)}`,
    "DELETE",
  );
}
