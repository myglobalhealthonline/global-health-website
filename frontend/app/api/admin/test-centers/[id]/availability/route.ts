import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for a test center's recurring availability windows.
 * Railway subdomains can't share cookies (PSL boundary), so admin client calls
 * route through this Next handler rather than hitting the backend directly.
 *
 *   GET  /api/admin/test-centers/:id/availability  — list windows + timezone
 *   POST /api/admin/test-centers/:id/availability  — create a window
 *
 * Per-window operations (PATCH / DELETE) live under `[availabilityId]/route.ts`.
 */

type Params = Promise<{ id: string }>;

function backendPath(id: string): string {
  return `/api/admin/test-centers/${encodeURIComponent(id)}/availability`;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  return forwardToBackend(request, backendPath(id), "GET");
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  return forwardToBackend(request, backendPath(id), "POST");
}
