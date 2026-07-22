import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Proxy for the admin lab-requisition queue (Synlab CZ / WebLIMS 2).
 *
 * One catch-all rather than eight near-identical files, because the subtree is
 * a fixed set of per-record actions. Every path is allowlisted by shape — an
 * unrecognised segment 404s here instead of being forwarded.
 */

const POST_ACTIONS = new Set([
  "confirm",
  "payment-link",
  "weblims-form",
  "methods",
  "result-list",
]);

function isAllowed(method: string, segments: string[]): boolean {
  if (method === "GET") {
    // list: []   |   one record: ["<id>"]
    return segments.length <= 1;
  }
  if (method === "POST") {
    return segments.length === 2 && POST_ACTIONS.has(segments[1]!);
  }
  if (method === "PATCH") {
    return segments.length === 2 && segments[1] === "status";
  }
  return false;
}

async function proxy(
  request: NextRequest,
  method: "GET" | "POST" | "PATCH",
  segments: string[],
) {
  if (!isAllowed(method, segments)) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  const suffix = segments.map((s) => encodeURIComponent(s)).join("/");
  const path = `/api/admin/lab-requisitions${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`;
  return forwardToBackend(request, path, method);
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, "GET", (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, "POST", (await params).path ?? []);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, "PATCH", (await params).path ?? []);
}
