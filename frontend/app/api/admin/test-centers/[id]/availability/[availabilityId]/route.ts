import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Per-window operations on a test center's recurring availability.
 * The backend scopes the lookup by center id, so one center can never patch
 * another's hours.
 *
 *   PATCH  /api/admin/test-centers/:id/availability/:availabilityId
 *   DELETE /api/admin/test-centers/:id/availability/:availabilityId
 */

type Params = Promise<{ id: string; availabilityId: string }>;

function backendPath(id: string, availabilityId: string): string {
  return `/api/admin/test-centers/${encodeURIComponent(id)}/availability/${encodeURIComponent(availabilityId)}`;
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id, availabilityId } = await params;
  return forwardToBackend(request, backendPath(id, availabilityId), "PATCH");
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id, availabilityId } = await params;
  return forwardToBackend(request, backendPath(id, availabilityId), "DELETE");
}
