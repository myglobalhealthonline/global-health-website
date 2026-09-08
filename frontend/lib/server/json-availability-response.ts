import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Live availability remains explicitly non-cacheable, but its slot arrays can
 * be large. Compress the same-origin JSON when the browser advertises gzip;
 * leave other encodings to Next/the delivery layer.
 */
export function jsonAvailabilityResponse(
  request: NextRequest,
  body: unknown,
  headers: HeadersInit,
): NextResponse {
  if (!acceptsGzip(request.headers.get("accept-encoding"))) {
    return NextResponse.json(body, { headers });
  }

  const stream = new Blob([JSON.stringify(body)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("content-encoding", "gzip");
  responseHeaders.set("vary", "Accept-Encoding");
  return new NextResponse(stream, { headers: responseHeaders });
}

export function acceptsGzip(header: string | null): boolean {
  return (header ?? "").split(",").some((entry) => {
    const [coding, ...parameters] = entry.trim().toLowerCase().split(";");
    if (coding !== "gzip") return false;
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return !quality || Number(quality.trim().slice(2)) > 0;
  });
}
