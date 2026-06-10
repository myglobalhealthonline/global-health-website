import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return NextResponse.json({ ok: false, message: "API not configured" }, { status: 503 });

  const store = await cookies();
  const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    const res = await fetch(`${apiUrl}/api/account/trustpilot-reminder`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unavailable" }, { status: 503 });
  }
}
