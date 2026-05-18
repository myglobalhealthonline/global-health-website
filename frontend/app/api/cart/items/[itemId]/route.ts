import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ itemId: string }>;

async function proxy(
  request: NextRequest,
  { params }: { params: Params },
  method: "PATCH" | "DELETE",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend not configured" }, { status: 503 });
  }
  const { itemId } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = method === "PATCH" ? await request.text() : undefined;
  const upstream = await fetch(`${backend}/api/cart/items/${itemId}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(bodyText !== undefined ? { body: bodyText } : {}),
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(request: NextRequest, context: { params: Params }) {
  return proxy(request, context, "PATCH");
}
export async function DELETE(request: NextRequest, context: { params: Params }) {
  return proxy(request, context, "DELETE");
}
