import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ prescriptionId: string }>;

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { prescriptionId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";

  const upstream = await fetch(
    `${backend}/api/doctor/prescriptions/${prescriptionId}`,
    {
      method: "DELETE",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
