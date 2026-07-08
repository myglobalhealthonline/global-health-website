import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getRequestContext } from "@/lib/routing/get-request-context";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Frontend edge proxy.
 *
 * Responsibilities (post-legacy cleanup):
 *   1. Auth-gate `/account/*` and `/admin/*` and `/doctor/*` by
 *      verifying the JWT cookie LOCALLY (HS256 via `jose`, which runs
 *      in the edge runtime). Previously we called the backend's
 *      `/api/auth/me` on every nav — measurable TTFB cost per internal
 *      link. The local verify uses the same `AUTH_JWT_SECRET` and the
 *      same issuer/audience claims as the backend signer in
 *      `backend/src/utils/auth-session.ts`, so a leaked-cookie attack
 *      surface stays identical.
 *
 *      A backend round-trip still happens on every authenticated API
 *      request — this only skips it at navigation time.
 *
 *   2. Stamp `x-gh-country`, `x-gh-locale`, `x-gh-pathname` request
 *      headers so downstream RSCs can read locale context.
 */
const PUBLIC_FILE = /\.(.*)$/;

// Content-Security-Policy.
//
// Baseline (every public document): the existing clickjacking + object/base-uri
// lockdown, intentionally with NO script-src. The public site is statically
// generated (generateStaticParams across the whole (site) group), and a
// per-request nonce is fundamentally incompatible with static rendering — Next
// stamps nonces only during dynamic server rendering, so a build-time page's
// scripts would carry no nonce and modern browsers (which ignore the
// 'unsafe-inline' fallback once a nonce is present) would BLOCK all JS. So the
// public site keeps the no-script-src policy.
//
// The authenticated portals (/account, /admin, /doctor, /corporate) always
// render dynamically — their layouts read the auth cookie — so there we add a
// real nonce-based script-src backstop against inline-script injection. Next
// extracts the nonce from the request's CSP header and stamps it onto its own
// bootstrap/hydration scripts automatically. (The Meta Pixel inline <Script>
// in the root layout is NOT auto-nonced and will be CSP-blocked on these
// routes — acceptable, and arguably desirable: no ad tracking on PHI portals.)
const CSP_BASE = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'";
const NONCE_ROUTES = /^\/(account|admin|doctor|corporate)(\/|$)/;
// The nonce script-src is OFF by default so this ships risk-free: with the flag
// unset every route gets the exact baseline CSP that was in effect before (the
// static policy that used to live in next.config.ts). The nonce path only
// affects the always-dynamic authenticated portals and relies on Next stamping
// the nonce onto its own scripts — verify one logged-in portal page hydrates
// with no CSP console errors in a PRODUCTION build, then set ENABLE_NONCE_CSP=true.
const NONCE_CSP_ENABLED = process.env.ENABLE_NONCE_CSP === "true";

function nonceCsp(nonce: string): string {
  return [
    // 'unsafe-inline' is a legacy fallback only — browsers honoring the
    // nonce/'strict-dynamic' ignore it. 'unsafe-eval' intentionally omitted.
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    // CMS + Tailwind emit inline <style>; keep style-src permissive.
    "style-src 'self' 'unsafe-inline'",
    CSP_BASE,
  ].join("; ");
}

const JWT_ISSUER = "global-health-backend";
const JWT_AUDIENCE = "global-health-website";

let cachedSecretKey: Uint8Array | null = null;
function getJwtSecretKey(): Uint8Array | null {
  if (cachedSecretKey) return cachedSecretKey;
  const raw = process.env.AUTH_JWT_SECRET?.trim();
  if (!raw) return null;
  cachedSecretKey = new TextEncoder().encode(raw);
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

async function resolveSession(request: NextRequest): Promise<SessionLookup> {
  const key = getJwtSecretKey();
  if (!key) {
    // The edge check is only an optimization. When the frontend env
    // lacks AUTH_JWT_SECRET, fall back to the server-side auth fetches
    // used by the layouts/pages instead of hard-failing navigation.
    //
    // This keeps logout and role-gated redirects working even if only
    // the frontend service is missing the secret, while the backend
    // remains the source of truth for the actual session.
    return { kind: "misconfigured" };
  }
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { kind: "ok", role: null, email: null };
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"], // pin: reject alg:none / alg-confusion
    });
    return {
      kind: "ok",
      role: isSessionRole(payload.role) ? payload.role : null,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    return { kind: "ok", role: null, email: null };
  }
}

function normalizeNextPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/account";
  return pathname;
}

/**
 * Handle a `misconfigured` edge session (AUTH_JWT_SECRET unset on the
 * frontend) for a protected route. Defense-in-depth: in production we fail
 * CLOSED — log loudly and redirect to login rather than silently passing
 * unauthenticated traffic through to the protected page tree. In development
 * we pass through so a missing local secret doesn't block work.
 */
function handleMisconfiguredSession(request: NextRequest, pathname: string) {
  console.error(
    "[proxy] AUTH_JWT_SECRET is not set — edge auth disabled for",
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
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
