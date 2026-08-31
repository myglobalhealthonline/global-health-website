import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { proxyClientIpHeaders } from "@/lib/server/proxy-client-ip";
import { readBoundedBody } from "@/lib/server/read-bounded-body";

export const dynamic = "force-dynamic";
const MAX_MULTIPART_BYTES = 6 * 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

const noStoreJson = (message: string, status: number) => NextResponse.json(
  { ok: false, message }, { status, headers: { "cache-control": "no-store" } },
);

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!SAFE_ID.test(id)) return noStoreJson("Not found", 404);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return noStoreJson("Multipart form data is required", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    return noStoreJson("The upload is too large", 413);
  }
  const body = await readBoundedBody(request.body, MAX_MULTIPART_BYTES);
  if (!body) return noStoreJson("The upload is too large", 413);
  const backend = getBackendOrigin();
  if (!backend) return noStoreJson("Applications are temporarily unavailable", 503);

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/public/jobs/${encodeURIComponent(id)}/applications`, {
      method: "POST", body: body as BodyInit, cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { "content-type": contentType, ...proxyClientIpHeaders(request) },
    });
  } catch {
    return noStoreJson("Applications are temporarily unavailable", 503);
  }
  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
