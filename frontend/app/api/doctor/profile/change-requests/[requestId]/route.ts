import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for withdrawing one pending profile change request.
 * Mirrors /api/doctor/profile/change-requests — see that file for why the
 * proxy exists and why nothing is revalidated here.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const { requestId } = await params;
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const upstream = await fetch(
    `${backend}/api/doctor/profile/change-requests/${encodeURIComponent(requestId)}`,
    {
      method: "DELETE",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
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
