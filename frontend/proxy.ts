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

type SessionRole = "PATIENT" | "ADMIN" | "DOCTOR";
type SessionLookup =
  | { kind: "ok"; role: SessionRole | null }
  | { kind: "misconfigured" };

function isSessionRole(value: unknown): value is SessionRole {
  return value === "PATIENT" || value === "ADMIN" || value === "DOCTOR";
}

async function resolveSession(request: NextRequest): Promise<SessionLookup> {
  const key = getJwtSecretKey();
  if (!key) {
    // Without the secret we can't verify anything. Returning "no role"
    // would silently redirect every authenticated nav to /login — a
    // confusing outage when the real cause is a missing env var.
    // Surface it as a 503 instead so ops sees the misconfig.
    return { kind: "misconfigured" };
  }
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { kind: "ok", role: null };
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return {
      kind: "ok",
      role: isSessionRole(payload.role) ? payload.role : null,
    };
  } catch {
    return { kind: "ok", role: null };
  }
}

function misconfiguredResponse() {
  return new NextResponse(
    "Auth verification is not configured: AUTH_JWT_SECRET is missing.",
    { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

function normalizeNextPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/account";
  return pathname;
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

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return misconfiguredResponse();
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
    if (role !== "PATIENT") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return misconfiguredResponse();
    const role = session.role;
    if (role === "ADMIN") {
      // continue
    } else if (role === "DOCTOR") {
      const doctorUrl = request.nextUrl.clone();
      doctorUrl.pathname = "/doctor";
      doctorUrl.search = "";
      return NextResponse.redirect(doctorUrl);
    } else if (role === "PATIENT") {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = "/account";
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    } else {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) {
    const session = await resolveSession(request);
    if (session.kind === "misconfigured") return misconfiguredResponse();
    const role = session.role;
    if (role === "DOCTOR") {
      // continue
    } else if (role === "ADMIN") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    } else if (role === "PATIENT") {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = "/account";
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    } else {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
