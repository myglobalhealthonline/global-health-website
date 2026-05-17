import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Shared cookie-forwarding proxy helper for Next route handlers. Reused
 * by every /api/doctor/* and /api/admin/* proxy. Centralising here means
 * a Railway-cookie quirk fix only changes in one place.
 */
export async function forwardToBackend(
  request: NextRequest,
  backendPath: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT",
): Promise<NextResponse> {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const cookie = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method,
    headers: {
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  };
  if (method !== "GET" && method !== "DELETE") {
    const body = await request.text();
    if (body) init.body = body;
  }
  const upstream = await fetch(`${backend}${backendPath}`, init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
