import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { NextResponse } from "next/server";

async function forward(request: Request) {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return NextResponse.json({ ok: false, message: "API not configured" }, { status: 503 });

  const store = await cookies();
  const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    const res = await fetch(`${apiUrl}/api/account/trustpilot-reminder${new URL(request.url).search}`, {
      method: request.method,
      headers: { ...(cookieHeader ? { cookie: cookieHeader } : {}), "content-type": "application/json" },
      ...(request.method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }
}

export const GET = forward;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  return forward(request);
}
