import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!SAFE_ID.test(id)) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  const backend = getBackendOrigin();
  if (!backend) return NextResponse.json({ ok: false, message: "Backend is not configured" }, { status: 503 });
  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/admin/job-applications/${encodeURIComponent(id)}/cv`, {
      headers: request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {},
      cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend is unavailable" }, { status: 503 });
  }
  const headers = new Headers({
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox",
  });
  for (const name of ["content-type", "content-disposition", "x-content-type-options", "content-security-policy"]) {
    const value = upstream.headers.get(name); if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
