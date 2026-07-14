import "server-only";
import type { NextRequest } from "next/server";

/**
 * Headers that tell the backend which VISITOR a proxied request belongs to.
 *
 * Every Next route-handler proxy calls the backend server-side, so at the
 * backend hop request.ip is this frontend service's egress IP for every
 * visitor — the whole site shares one rate-limit bucket and 429s under
 * normal traffic. The backend's rate limiter (backend/src/app.ts) keys on
 * x-gh-client-ip instead, but only when x-gh-proxy-secret matches
 * PROXY_CLIENT_IP_SECRET (same value set on both Railway services), so
 * direct callers can't spoof their bucket.
 *
 * Secret unset → returns {} and the backend keys on request.ip (previous
 * behaviour, safe fallback).
 */
export function proxyClientIpHeaders(request: NextRequest): Record<string, string> {
  const secret = process.env.PROXY_CLIENT_IP_SECRET?.trim();
  if (!secret) return {};
  // Railway's edge sets x-forwarded-for; first hop is the real client.
  const fwd = request.headers.get("x-forwarded-for");
  const clientIp = fwd?.split(",")[0]?.trim();
  if (!clientIp || clientIp.length > 64) return {};
  return { "x-gh-proxy-secret": secret, "x-gh-client-ip": clientIp };
}
