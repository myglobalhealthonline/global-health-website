/**
 * Next.js edge middleware entry point.
 *
 * Delegates entirely to `proxy.ts` which handles:
 *   1. Auth-gating /account, /admin, /doctor routes.
 *   2. Stamping x-gh-country, x-gh-locale, x-gh-pathname request headers
 *      so downstream RSCs (SiteLayout → getSiteContext) can resolve the
 *      correct locale for the navbar / footer without reading the cookie.
 *
 * The implementation lives in proxy.ts so it can be unit-tested and
 * imported independently without coupling to the Next.js middleware
 * module contract.
 */
export { proxy as default } from "./proxy";

// config must be a static literal in this file — Next.js parses it at
// compile time and cannot follow re-exports from other modules.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
