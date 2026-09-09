import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Bulk block / unblock / remove across a test center's slots — the grid's
 * selection toolbar. BOOKED and HELD slots come back counted in
 * `skippedOccupied` rather than failing the request.
 */

type Params = Promise<{ id: string; locationId: string }>;

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id, locationId } = await params;
  return forwardToBackend(
    request,
    `/api/admin/test-centers/${encodeURIComponent(id)}/locations/${encodeURIComponent(locationId)}/time-slots/bulk`,
    "POST",
  );
}
