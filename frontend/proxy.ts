import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify, importSPKI, type JWTPayload } from "jose";
import { getRequestContext } from "@/lib/routing/get-request-context";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Frontend edge proxy.
 *
 * Responsibilities (post-legacy cleanup):
 *   1. Auth-gate `/account/*` and `/admin/*` and `/doctor/*` by
 *      verifying the JWT cookie LOCALLY in the edge runtime. Previously
 *      we called the backend's `/api/auth/me` on every nav — measurable
 *      TTFB cost per internal link.
 *
 *      S-012: the frontend holds ONLY the RS256 PUBLIC verification key
 *      (`AUTH_JWT_PUBLIC_KEY`), never the private signing key — so a
 *      frontend compromise can verify sessions but can NEVER mint backend
 *      tokens. The verify mirrors the backend's dual-key rotation: try the
 *      RS256 public key first, then fall back to the legacy HS256 shared
 *      secret (`AUTH_JWT_SECRET`) for cookies issued before asymmetric
 *      signing shipped. See `backend/src/utils/auth-session.ts`
 *      (`verifyWithRotation`) for the matching logic and the HS256-removal
 *      follow-up.
 *
 *      A backend round-trip still happens on every authenticated API
 *      request — this only skips it at navigation time.
 *
 *   2. Stamp `x-gh-country`, `x-gh-locale`, `x-gh-pathname` request
 *      headers so downstream RSCs can read locale context.
 */
const PUBLIC_FILE = /\.(.*)$/;

// Content-Security-Policy (S-010 — see SECURITY_AUDIT2.md, AUDIT2 workstream W6).
//
// Two policies, one per rendering mode, because a per-request nonce is
// fundamentally incompatible with static output (Next stamps nonces only during
// dynamic server rendering; a build-time page's scripts would carry no nonce and
// modern browsers, which ignore 'unsafe-inline' once a nonce is present, would
// BLOCK all JS):
//
//   • Public documents (the (site) group + login/register etc.): the enforcing
//     baseline below — clickjacking + object/base-uri lockdown, NO script-src —
//     PLUS a full report-only policy (default/script/style/img/font/connect/
//     frame/form-action) shipped from `next.config.ts headers()`. Report-only so
//     it can't break the (currently still dynamically-rendered — see P-001 notes
//     on (site)/layout.tsx) public pages; it exists to gather the inline-script
//     violations needed to derive hashes before enforcing.
//
//   • Authenticated portals (/account, /admin, /doctor, /corporate): these
//     always render dynamically (their layouts read the auth cookie), so here we
//     ship an ENFORCING nonce/'strict-dynamic' script policy. Next extracts the
//     nonce from the request's CSP header and stamps it onto its own bootstrap/
//     hydration scripts automatically. (The Meta Pixel inline <Script> is NOT
//     auto-nonced and is CSP-blocked on these routes — desirable: no ad tracking
//     on PHI portals.)
const CSP_BASE = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'";
const NONCE_ROUTES = /^\/(account|admin|doctor|corporate)(\/|$)/;
// Backend API / media origin — portal client fetches (`NEXT_PUBLIC_API_URL`) and
// media <img> need to be reachable under connect-src / img-src. Empty on deploys
// where the public env is unset (same-origin only), which is fine.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
// Enforcing nonce CSP is ON by default for the portals (W6). Kill switch:
// set DISABLE_NONCE_CSP=true to fall back to the bare baseline if a portal page
// is ever found to hydrate with CSP console errors in production. The public
// site is unaffected either way (it never matches NONCE_ROUTES).
const NONCE_CSP_ENABLED = process.env.DISABLE_NONCE_CSP !== "true";

function nonceCsp(nonce: string): string {
  const media = API_ORIGIN ? ` ${API_ORIGIN}` : "";
  // React dev mode needs eval() for stack reconstruction; production never does.
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    // 'unsafe-inline' + https: are legacy fallbacks only — browsers honoring the
    // nonce/'strict-dynamic' ignore them. 'unsafe-eval' intentionally omitted in prod.
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'${devEval}`,
    // CMS + Tailwind emit inline <style>; keep style-src permissive.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${media}`,
    "font-src 'self' data:",
    `connect-src 'self'${media}`,
    `form-action 'self'${media}`,
    CSP_BASE,
  ].join("; ");
}

const JWT_ISSUER = "global-health-backend";
const JWT_AUDIENCE = "global-health-website";

// S-012: RS256 PUBLIC verification key. The frontend NEVER holds the private
// signing key. importSPKI is async (WebCrypto) so we cache the imported key.
// `undefined` = not yet attempted; `null` = configured-but-unavailable / unset.
type PublicKey = Awaited<ReturnType<typeof importSPKI>>;
let cachedPublicKey: PublicKey | null | undefined;
async function getJwtPublicKey(): Promise<PublicKey | null> {
  if (cachedPublicKey !== undefined) return cachedPublicKey;
  const raw = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, "\n").trim();
  if (!raw) {
    cachedPublicKey = null;
    return null;
  }
  try {
    cachedPublicKey = await importSPKI(raw, "RS256");
  } catch (err) {
    console.error("[proxy] failed to import AUTH_JWT_PUBLIC_KEY:", err);
    cachedPublicKey = null;
  }
  return cachedPublicKey;
}

// Legacy HS256 shared secret — transitional verify-fallback for cookies issued
// before asymmetric signing shipped. Remove with the S-012 HS256-removal
// follow-up (see auth-session.ts).
let cachedSecretKey: Uint8Array | null | undefined;
function getJwtSecretKey(): Uint8Array | null {
  if (cachedSecretKey !== undefined) return cachedSecretKey;
  const raw = process.env.AUTH_JWT_SECRET?.trim();
  cachedSecretKey = raw ? new TextEncoder().encode(raw) : null;
  return cachedSecretKey;
}

type SessionRole =
  | "PATIENT"
  | "ADMIN"
  | "DOCTOR"
  | "LOCAL_ADMIN"
  | "SUPER_ADMIN"
  | "CORPORATE_ADMIN";
type SessionLookup =
  | { kind: "ok"; role: SessionRole | null; email: string | null }
  | { kind: "misconfigured" };

const SESSION_ROLES: SessionRole[] = [
  "PATIENT",
  "ADMIN",
  "DOCTOR",
  "LOCAL_ADMIN",
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
];

function isSessionRole(value: unknown): value is SessionRole {
  return SESSION_ROLES.includes(value as SessionRole);
}

/**
 * Verify the cookie against the RS256 public key first, then fall back to the
 * legacy HS256 shared secret. Each branch PINS its own algorithm to its own key,
 * so there is no RS256↔HS256 alg-confusion (the public key is only ever an RS256
 * verifier, the secret only ever an HS256 one). Mirrors the backend's
 * `verifyWithRotation`. Returns the decoded payload or null.
 */
async function verifyWithRotation(
  token: string,
  publicKey: PublicKey | null,
  secretKey: Uint8Array | null,
): Promise<JWTPayload | null> {
  const opts = { issuer: JWT_ISSUER, audience: JWT_AUDIENCE };
  if (publicKey) {
    try {
      const { payload } = await jwtVerify(token, publicKey, { ...opts, algorithms: ["RS256"] });
      return payload;
    } catch {
      // Not a valid RS256 token — try the legacy HS256 secret below.
    }
  }
  if (secretKey) {
    try {
      const { payload } = await jwtVerify(token, secretKey, { ...opts, algorithms: ["HS256"] });
      return payload;
    } catch {
      // Invalid under both keys.
    }
  }
  return null;
}

async function resolveSession(request: NextRequest): Promise<SessionLookup> {
  const publicKey = await getJwtPublicKey();
  const secretKey = getJwtSecretKey();
  if (!publicKey && !secretKey) {
    // The edge check is only an optimization. When the frontend env lacks BOTH
    // verification keys, fall back to the server-side auth fetches used by the
    // layouts/pages instead of hard-failing navigation.
    //
    // This keeps logout and role-gated redirects working even if only the
    // frontend service is missing the key, while the backend remains the source
    // of truth for the actual session.
    return { kind: "misconfigured" };
  }
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { kind: "ok", role: null, email: null };
  const payload = await verifyWithRotation(token, publicKey, secretKey);
  if (!payload) return { kind: "ok", role: null, email: null };
  return {
    kind: "ok",
    role: isSessionRole(payload.role) ? payload.role : null,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

function normalizeNextPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/account";
  return pathname;
}

/**
 * Handle a `misconfigured` edge session (neither AUTH_JWT_PUBLIC_KEY nor the
 * legacy AUTH_JWT_SECRET set on the frontend) for a protected route.
 * Defense-in-depth: in production we fail CLOSED — log loudly and redirect to
 * login rather than silently passing unauthenticated traffic through to the
 * protected page tree. In development we pass through so a missing local key
 * doesn't block work.
 */
function handleMisconfiguredSession(request: NextRequest, pathname: string) {
  console.error(
    "[proxy] no JWT verification key (AUTH_JWT_PUBLIC_KEY / AUTH_JWT_SECRET) set — edge auth disabled for",
    pathname,
  );
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", normalizeNextPath(pathname));
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Server Action invocations (sign-out, form submits, etc.) POST to the
  // current page URL carrying a `next-action` header. A raw edge redirect
  // here is not a valid Server Action response — the client action runtime
  // can't parse it and throws, surfacing as the generic error boundary
  // ("Something went wrong"). The action's own auth check + redirect() is
  // the real source of truth, so skip the edge role-gate for these and let
  // the request through.
  const isServerAction = request.headers.has("next-action");

  if (!isServerAction && (pathname === "/account" || pathname.startsWith("/account/"))) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return handleMisconfiguredSession(request, pathname);
    const role = session.role;
    if (role === "DOCTOR") {
      const doctorUrl = request.nextUrl.clone();
      doctorUrl.pathname = "/doctor";
      doctorUrl.search = "";
      return NextResponse.redirect(doctorUrl);
    }
    if (role === "ADMIN") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    }
    if (role === null) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
    // PATIENT, SUPER_ADMIN, LOCAL_ADMIN, CORPORATE_ADMIN: let the account
    // layout's own server-side check decide (it further redirects
    // CORPORATE_ADMIN to /corporate).
  }

  if (!isServerAction && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return handleMisconfiguredSession(request, pathname);
    const role = session.role;
    if (role === "DOCTOR") {
      const doctorUrl = request.nextUrl.clone();
      doctorUrl.pathname = "/doctor";
      doctorUrl.search = "";
      return NextResponse.redirect(doctorUrl);
    } else if (role === "PATIENT") {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = "/account";
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    } else if (role === null) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
    // ADMIN, SUPER_ADMIN, LOCAL_ADMIN, CORPORATE_ADMIN: let the admin
    // layout's own server-side check decide.
  }

  if (!isServerAction && (pathname === "/doctor" || pathname.startsWith("/doctor/"))) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return handleMisconfiguredSession(request, pathname);
    const role = session.role;
    if (role === "ADMIN") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    } else if (role === "PATIENT") {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = "/account";
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    } else if (role === null) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
    // DOCTOR, SUPER_ADMIN, LOCAL_ADMIN, CORPORATE_ADMIN: let the doctor
    // layout's own server-side check decide.
  }

  const context = getRequestContext({
    host: request.headers.get("host"),
    pathname,
    acceptLanguageHeader: request.headers.get("accept-language"),
    localeCookie: request.cookies.get("gh_locale")?.value ?? null,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-gh-country", context.countryCode);
  requestHeaders.set("x-gh-locale", context.locale);
  requestHeaders.set("x-gh-pathname", pathname);

  // Stamp the authenticated role so the site layout can render the nav
  // without making a backend HTTP round-trip on every public page.
  // Local JWT decode — no I/O. Layout falls back to null on missing header.
  const session = await resolveSession(request);
  if (session.kind === "ok" && session.role) {
    requestHeaders.set("x-gh-role", session.role);
  } else {
    requestHeaders.delete("x-gh-role");
  }
  // Stamp the email too so the header can render a personal avatar
  // (initial) without a backend round-trip. Always set-or-delete so a
  // client-supplied x-gh-email can never be trusted (same guard as role).
  if (session.kind === "ok" && session.email) {
    requestHeaders.set("x-gh-email", session.email);
  } else {
    requestHeaders.delete("x-gh-email");
  }

  // Attach the CSP. Nonce policy for the dynamic portals — set on the request
  // header too so Next can extract the nonce for its own scripts; baseline
  // policy (no script-src) for every other document. Exactly one CSP header is
  // emitted per request (the static one was removed from next.config.ts).
  let csp = CSP_BASE;
  if (NONCE_CSP_ENABLED && NONCE_ROUTES.test(pathname)) {
    const nonce = btoa(crypto.randomUUID());
    csp = nonceCsp(nonce);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);

  // P-001: bare, non-HttpOnly boolean hint for the public-site client auth
  // island (PublicAuthContext) — lets the browser skip its /api/auth/me
  // round-trip for the (majority) anonymous visitor without any I/O here,
  // since `session` above was already resolved from a local JWT decode.
  // Carries no sensitive data, just "a session looked valid at this edge
  // check" — the real auth decision still happens against the httpOnly
  // session cookie server-side. Left untouched when `resolveSession` itself
  // is misconfigured (no verification key available) rather than guessing.
  if (session.kind === "ok") {
    if (session.role !== null) {
      response.cookies.set("gh-auth-hint", "1", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } else {
      response.cookies.delete("gh-auth-hint");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
