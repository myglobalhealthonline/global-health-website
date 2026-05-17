import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/routing/get-request-context";

/**
 * Frontend edge proxy.
 *
 * Responsibilities (post-legacy cleanup):
 *   1. Auth-gate `/account/*` and `/admin/*` by calling the backend
 *      `/api/auth/me` with the request's cookies. Patients hitting
 *      `/admin/*` get redirected to `/account`. Unauthenticated visitors
 *      get redirected to `/login?next=…`.
 *   2. Stamp `x-gh-country`, `x-gh-locale`, `x-gh-pathname` request
 *      headers so downstream RSCs can read locale context.
 *
 * The legacy Wix redirect map (`/home-pt → /portugal/pt`, etc.) was
 * removed when we deleted the dormant routes. Inbound traffic for those
 * URLs now just 404s — there's no live Wix audience to preserve.
 */
const PUBLIC_FILE = /\.(.*)$/;

/** Same resolution as `getBackendOrigin()` (API_BASE_URL first). Avoids localhost in production. */
function getApiBaseUrl() {
  const raw =
    process.env.API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  const origin = raw.replace(/\/+$/, "");
  if (origin) return origin;
  if (process.env.NODE_ENV === "development") return "http://localhost:4000";
  return "";
}

function normalizeNextPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/account";
  return pathname;
}

async function resolveSessionUser(request: NextRequest): Promise<{
  role: "PATIENT" | "ADMIN" | "DOCTOR" | null;
}> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) return { role: null };
  try {
    const response = await fetch(`${apiBase}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
    if (!response.ok) return { role: null };
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { user?: { role?: string } };
    };
    const role = json.data?.user?.role;
    if (
      json.ok === true &&
      (role === "PATIENT" || role === "ADMIN" || role === "DOCTOR")
    ) {
      return { role };
    }
    return { role: null };
  } catch {
    return { role: null };
  }
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
    const session = await resolveSessionUser(request);
    if (session.role === "DOCTOR") {
      // Doctors don't have a patient profile here — bounce them home.
      const doctorUrl = request.nextUrl.clone();
      doctorUrl.pathname = "/doctor";
      doctorUrl.search = "";
      return NextResponse.redirect(doctorUrl);
    }
    const allowed = session.role === "PATIENT" || session.role === "ADMIN";
    if (!allowed) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", normalizeNextPath(pathname));
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const session = await resolveSessionUser(request);
    if (session.role === "ADMIN") {
      // continue
    } else if (session.role === "DOCTOR") {
      const doctorUrl = request.nextUrl.clone();
      doctorUrl.pathname = "/doctor";
      doctorUrl.search = "";
      return NextResponse.redirect(doctorUrl);
    } else if (session.role === "PATIENT") {
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
    const session = await resolveSessionUser(request);
    if (session.role === "DOCTOR" || session.role === "ADMIN") {
      // continue — admins can see the doctor portal for support purposes
    } else if (session.role === "PATIENT") {
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
