import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for the doctor's own profile change requests. Cookies
 * don't traverse subdomains on Railway so a direct browser → backend call
 * would be unauthenticated — forward via this route handler, mirroring
 * /api/doctor/profile.
 *
 * No cache revalidation on either verb: proposing a change deliberately leaves
 * the live profile alone, so there is nothing public to bust. That happens on
 * the admin approve path instead.
 */

async function forward(
  request: NextRequest,
  method: "GET" | "POST",
): Promise<NextResponse> {
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
  const body = method === "POST" ? await request.text() : undefined;
  const upstream = await fetch(`${backend}/api/doctor/profile/change-requests`, {
    method,
    headers: {
      ...(method === "POST"
        ? {
            "content-type":
              request.headers.get("content-type") ?? "application/json",
          }
        : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(body ? { body } : {}),
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function POST(request: NextRequest) {
  return forward(request, "POST");
}
