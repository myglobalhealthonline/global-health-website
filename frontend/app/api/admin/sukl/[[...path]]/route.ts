import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Proxy for the admin SÚKL console (Czech ePoukaz / eRecept).
 *
 * This is the ONLY frontend file that may reference the SÚKL backend at all. No
 * SUKL_* environment variable exists on the frontend service — the certificate
 * and its password live exclusively on the backend, and nothing here can reach
 * them. See docs/sukl/SECURITY_MODEL.md.
 *
 * Every path is allowlisted by shape; an unrecognised segment 404s here rather
 * than being forwarded.
 */

function isAllowed(method: string, segments: string[]): boolean {
  if (method === "GET") {
    // ["status"] | ["doctor-identities"] | ["wsdl"]
    return (
      segments.length === 1 &&
      (segments[0] === "status" ||
        segments[0] === "doctor-identities" ||
        segments[0] === "wsdl")
    );
  }
  if (method === "POST") {
    return (
      segments.length === 1 &&
      (segments[0] === "test-connection" ||
        segments[0] === "app-ping" ||
        segments[0] === "app-info")
    );
  }
  if (method === "PUT" || method === "DELETE") {
    // ["doctor-identities", "<doctorUserId>"]
    return segments.length === 2 && segments[0] === "doctor-identities";
  }
  return false;
}

async function proxy(
  request: NextRequest,
  method: "GET" | "POST" | "PUT" | "DELETE",
  segments: string[],
) {
  if (!isAllowed(method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  const suffix = segments.map((s) => encodeURIComponent(s)).join("/");
  const path = `/api/admin/sukl${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`;
  return forwardToBackend(request, path, method);
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, "GET", (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, "POST", (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, "PUT", (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, "DELETE", (await params).path ?? []);
}
