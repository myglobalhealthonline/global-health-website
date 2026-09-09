import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; locationId: string; slotId: string }>;

/**
 * One slot of one test center: block/unblock or resize (PATCH), or remove for
 * its own date (DELETE, which also records an availability exception so the
 * recurring window doesn't regenerate it).
 *
 * Hand-rolled rather than using `forwardToBackend`, for one reason: that helper
 * drops the request body on DELETE, and this DELETE carries the admin's
 * optional `reason` note. Same shape as the doctor slot proxy, which sidesteps
 * it the same way.
 */
async function forward(
  request: NextRequest,
  params: Params,
  method: "PATCH" | "DELETE",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend not configured" },
      { status: 503 },
    );
  }
  const { id, locationId, slotId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = await request.text();

  const upstream = await fetch(
    `${backend}/api/admin/test-centers/${encodeURIComponent(id)}/locations/${encodeURIComponent(locationId)}/time-slots/${encodeURIComponent(slotId)}`,
    {
      method,
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: bodyText || undefined,
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return forward(request, params, "PATCH");
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return forward(request, params, "DELETE");
}
