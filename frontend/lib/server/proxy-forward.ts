import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Shared cookie-forwarding proxy helper for Next route handlers. Reused
 * by every /api/doctor/* and /api/admin/* proxy. Centralising here means
 * a Railway-cookie quirk fix only changes in one place.
 */
/** JSON CRUD proxies never need more than this to reach the backend. */
const FORWARD_TIMEOUT_MS = 20_000;

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
    signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
  };
  if (method !== "GET" && method !== "DELETE") {
    const body = await request.text();
    if (body) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}${backendPath}`, init);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      { ok: false, message: timedOut ? "Backend request timed out" : "Backend is unavailable" },
      { status: timedOut ? 504 : 503 },
    );
  }

  // Stream the body straight through instead of buffering it into a string
  // first — none of this helper's callers inspect or transform the response.
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
