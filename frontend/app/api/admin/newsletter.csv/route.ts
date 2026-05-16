import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the admin newsletter CSV export. The browser will
 * not send the `gh_auth` cookie to a cross-origin `<a href>` navigation, so
 * the bare backend URL returns 401 in production. This Route Handler
 * forwards the session cookie server-side and streams the CSV back with
 * the `Content-Disposition: attachment` header intact.
 */
export async function GET(_request: NextRequest) {
  const backend = getBackendOrigin();
  if (!backend) {
    return NextResponse.json(
      { ok: false, message: "Backend is not configured" },
      { status: 503 },
    );
  }
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const upstream = await fetch(`${backend}/api/admin/newsletter.csv`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Could not export subscribers", {
      status: upstream.status,
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition":
        upstream.headers.get("content-disposition") ??
        `attachment; filename="newsletter-subscribers.csv"`,
    },
  });
}
