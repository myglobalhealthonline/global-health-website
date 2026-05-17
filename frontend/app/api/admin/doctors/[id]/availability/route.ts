import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the admin doctor-availability endpoints. Railway
 * subdomains can't share cookies (PSL boundary) so admin client calls
 * route through this Next handler.
 *
 *   GET    /api/admin/doctors/:id/availability       — list windows
 *   POST   /api/admin/doctors/:id/availability       — create window
 *
 * Per-availability operations (PATCH / DELETE) live under the sibling
 * `[availabilityId]/route.ts`.
 */
async function forward(
  request: NextRequest,
  id: string,
  method: "GET" | "POST",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  };
  if (method === "POST") {
    const body = await request.text();
    if (body) init.body = body;
  }
  const upstream = await fetch(
    `${backend}/api/admin/doctors/${encodeURIComponent(id)}/availability`,
    init,
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forward(request, id, "GET");
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forward(request, id, "POST");
}
