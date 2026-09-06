/**
 * Who is allowed out of the shared per-IP rate-limit bucket, and into which
 * bucket instead.
 *
 * The Next.js frontend reaches this API server-side for BOTH `next build`
 * prerenders and live SSR page renders. At this hop `request.ip` is the
 * frontend service's single egress IP, so without a marker every one of those
 * reads — for every visitor, every country, every page — shares ONE 300/min
 * bucket. Measured 2026-08-08: one cold service-page render issues 12 backend
 * GETs, and keeping all 6 markets x 6 locales warm costs ~288 requests/min of
 * layout reads alone, so the 300/min bucket is exhausted before a single
 * content page is served. The frontend then surfaces the 429 as a 5xx on a
 * real content URL.
 *
 * Two SEPARATE trusted classes, deliberately not one:
 *
 *   build  (`x-gh-build: 1`) — a deploy prerendering ~550 pages across ~15
 *          worker processes in well under a minute. Needs a very high ceiling
 *          for a short burst; nobody is waiting on it.
 *   ssr    (`x-gh-ssr: 1`)   — steady-state page rendering for live visitors
 *          and crawlers. Must NOT inherit the build ceiling: it runs
 *          continuously, so its ceiling is the one that has to stay close to
 *          what the backend can actually serve.
 *
 * Both are gated on the SAME shared secret and the SAME allowlist of anonymous
 * public marketing GETs. Deliberately NOT an `allowList` (a full bypass): a
 * leaked secret would then grant unmetered reads. This only ever moves a
 * request to a different bounded bucket — never off the limiter.
 */

export type TrustableRequest = {
  method: string;
  url: string;
  headers: Record<string, unknown>;
};

/**
 * Anonymous public content GETs. Never a mutation, never
 * /api/auth|me|account|admin|doctor|corporate|payments.
 *
 * Prefix matching is exact-or-`/`-delimited, so `/api/doctors` cannot match
 * the private `/api/doctor/...` routes.
 */
export const PUBLIC_READ_PREFIXES = [
  "/api/countries",
  "/api/public/countries",
  "/api/doctors",
  "/api/services",
  "/api/specialties",
  "/api/health-tests",
  "/api/assets",
  "/api/blog",
  // Added 2026-08-08 alongside the SSR bucket — the ONLY entry not inherited
  // from the original build allowlist. The root layout of every public page
  // reads it, so leaving it on the shared visitor bucket recreated a smaller
  // version of the same bug at deploy time, when every replica's cache is cold
  // (measured: 40/40 of these 429'd while the other 11 endpoints went clean).
  // Same safety class as the rest: anonymous, no auth, no PHI, GET only — the
  // route itself documents "Anyone can fetch this".
  "/api/public/reviews-config",
  // TRUST-METRIC-001: same read pattern as reviews-config above — a public,
  // no-auth, no-PHI aggregate figure read by country pages and the doctors
  // listing across every market.
  "/api/public/consultation-count",
  // Homepage same-day GP quick-book — same anonymous-GET class as the two
  // entries above, and read by SSR on every market page. Missing here (and in
  // the frontend's matching list) meant both endpoints shared the 300/min
  // egress-IP visitor bucket. Keep both lists in lockstep.
  "/api/public/gp-availability",
  "/api/public/gp-languages",
  "/api/public/jobs",
] as const;

/** Correct secret + GET + an allowlisted public content path. */
function isAllowedPublicRead(req: TrustableRequest, secret: string | undefined): boolean {
  if (!secret || req.headers["x-gh-proxy-secret"] !== secret) return false;
  if (req.method !== "GET") return false;
  const path = req.url.split("?")[0] ?? "";
  return PUBLIC_READ_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** `next build` prerender read. Highest ceiling, own bucket. */
export function isTrustedBuildRead(req: TrustableRequest, secret: string | undefined): boolean {
  if (req.headers["x-gh-build"] !== "1") return false;
  return isAllowedPublicRead(req, secret);
}

/**
 * Live SSR public-content read. Own bucket, own (much lower) ceiling.
 *
 * A request carrying `x-gh-build: 1` is classified as a build read, never as
 * an SSR read, so the two buckets can never be reached by the same request and
 * SSR can never be relabelled into the build ceiling.
 */
export function isTrustedSsrPublicRead(req: TrustableRequest, secret: string | undefined): boolean {
  if (req.headers["x-gh-build"] === "1") return false;
  if (req.headers["x-gh-ssr"] !== "1") return false;
  return isAllowedPublicRead(req, secret);
}
