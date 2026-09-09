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

type Params = Promise<{ id: string }>;

function backendPath(id: string, search = ""): string {
  return `/api/admin/test-centers/${encodeURIComponent(id)}/time-slots${search}`;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  return forwardToBackend(request, backendPath(id, request.nextUrl.search), "GET");
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  return forwardToBackend(request, backendPath(id), "POST");
}
