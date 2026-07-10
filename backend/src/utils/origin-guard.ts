import type { FastifyReply, FastifyRequest } from "fastify";
import { errorResponse } from "./response.js";

const STATE_CHANGING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * S-013b: lightweight Origin / Sec-Fetch-Site check for state-changing
 * (POST/PATCH/DELETE) requests that carry the auth cookie.
 *
 * This is defense in depth, not the sole CSRF protection — the auth cookie
 * is already SameSite=Lax, which browsers don't attach to cross-site
 * fetch/XHR/form POSTs in the first place. This hook covers the cases
 * SameSite alone doesn't: browsers without SameSite support, and the
 * optional parent-domain cookie config (which makes sibling subdomains
 * same-site).
 *
 * Reuses the SAME allowlist `@fastify/cors` enforces (`isAllowedOrigin`),
 * rather than inventing a second one that could drift from it.
 *
 * A request is rejected only when we can POSITIVELY tell it's cross-site:
 *  - `Sec-Fetch-Site: cross-site` (modern browsers send Fetch Metadata on
 *    every request; this header can't be spoofed by page JS), or
 *  - an `Origin` header present but not on the allowlist.
 * Both headers are browser-only signals. The Next.js server → this API
 * proxy call (every real cookie-authenticated mutation in this app routes
 * through it — see `frontend/app/api/*` route handlers) is a same-origin,
 * server-to-server `fetch()` that carries neither header, so it passes
 * through untouched. A non-browser API client carries neither either and
 * is likewise unaffected — this hook only ever blocks a signal a real
 * cross-site browser request would have sent.
 */
export function buildOriginGuardHook(options: {
  cookieName: string;
  isAllowedOrigin: (origin: string) => boolean;
}) {
  const { cookieName, isAllowedOrigin } = options;

  return async function originGuardHook(request: FastifyRequest, reply: FastifyReply) {
    if (!STATE_CHANGING_METHODS.has(request.method)) return;

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader || !cookieHeader.includes(`${cookieName}=`)) return;

    const secFetchSite = request.headers["sec-fetch-site"];
    if (typeof secFetchSite === "string") {
      if (secFetchSite === "cross-site") {
        return reply.status(403).send(errorResponse("Cross-site request rejected"));
      }
      // "same-origin" / "same-site" / "none" (browser-initiated, not a
      // cross-site fetch) — trust it without also requiring Origin.
      return;
    }

    const origin = request.headers.origin;
    if (typeof origin === "string" && origin.length > 0 && !isAllowedOrigin(origin)) {
      return reply.status(403).send(errorResponse("Cross-site request rejected"));
    }
    // Neither header present: same-origin server-to-server proxy call or a
    // non-browser client. Nothing to positively flag as cross-site.
  };
}
