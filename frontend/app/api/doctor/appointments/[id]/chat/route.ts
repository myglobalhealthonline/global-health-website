import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function proxy(
  request: NextRequest,
  { params }: { params: Params },
  method: "GET" | "POST" | "PATCH",
) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  }
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const bodyText = method !== "GET" ? await request.text() : undefined;

  const upstream = await fetch(`${backend}/api/doctor/appointments/${id}/chat`, {
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

export async function GET(request: NextRequest, context: { params: Params }) {
  return proxy(request, context, "GET");
}

export async function POST(request: NextRequest, context: { params: Params }) {
  return proxy(request, context, "POST");
}

export async function PATCH(request: NextRequest, context: { params: Params }) {
  return proxy(request, context, "PATCH");
}
