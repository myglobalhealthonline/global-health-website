import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/routing/get-request-context";

const redirectMap: Record<string, string> = {};

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

async function hasAllowedAccountSession(request: NextRequest) {
  const auth = await resolveSessionUser(request);
  return auth.role === "PATIENT" || auth.role === "ADMIN";
}

async function resolveSessionUser(request: NextRequest): Promise<{
  role: "PATIENT" | "ADMIN" | null;
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
    if (json.ok === true && (role === "PATIENT" || role === "ADMIN")) {
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
    const allowed = await hasAllowedAccountSession(request);
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

  const redirectTarget = redirectMap[pathname];

  if (redirectTarget) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url);
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
  if (context.matchedLegacyRoute) {
    requestHeaders.set("x-gh-legacy-route", context.matchedLegacyRoute);
  }

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
