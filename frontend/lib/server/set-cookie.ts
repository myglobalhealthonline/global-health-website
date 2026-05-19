import "server-only";

/**
 * Strip `Domain=…` so the cookie binds to the proxy host, not the
 * backend host (which may live on a different subdomain on Railway).
 */
export function rewriteOutboundSetCookie(headerValue: string): string {
  return headerValue.replace(/;\s*Domain=[^;]*/gi, "").trim();
}

/**
 * Collect every Set-Cookie header from an upstream fetch Response. Uses
 * `getSetCookie()` when available (Node 20+ / undici); falls back to the
 * single `set-cookie` header otherwise. The plain `headers.get` API
 * collapses multiple Set-Cookie headers into one comma-joined string,
 * which is invalid for cookies that contain commas in their `Expires=`
 * attribute. This helper avoids that pitfall.
 */
export function collectSetCookies(headers: Headers): string[] {
  const getter = headers.getSetCookie?.bind(headers);
  if (getter) return getter();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * Append every Set-Cookie header from `upstream` to `outgoing`, with
 * `Domain=` stripped so cookies stick to the proxy host.
 */
export function forwardSetCookies(upstream: Headers, outgoing: Headers): void {
  for (const raw of collectSetCookies(upstream)) {
    outgoing.append("Set-Cookie", rewriteOutboundSetCookie(raw));
  }
}
