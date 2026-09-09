import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Concrete slots for one test center.
 *
 *   GET  /api/admin/test-centers/:id/time-slots?fromUtc=&toUtc=  — the grid's read
 *   POST /api/admin/test-centers/:id/time-slots                  — add ad-hoc slots
 *
 * The GET's range lives in the query string, so it is forwarded verbatim —
 * dropping it would silently return the wrong week.
 */

type Params = Promise<{ id: string; locationId: string }>;

function backendPath(id: string, locationId: string, search = ""): string {
  return `/api/admin/test-centers/${encodeURIComponent(id)}/locations/${encodeURIComponent(locationId)}/time-slots${search}`;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id, locationId } = await params;
  return forwardToBackend(request, backendPath(id, locationId, request.nextUrl.search), "GET");
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id, locationId } = await params;
  return forwardToBackend(request, backendPath(id, locationId), "POST");
}
