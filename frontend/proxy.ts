import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/routing/get-request-context";

const redirectMap: Record<string, string> = {
  "/terms-and-conditions": "/term-and-conditions",
  "/privacy-policy": "/privacy",
  "/copy-of-privacy-policy": "/privacy",
  "/refund-policy": "/return-and-refund-policy",
  "/gdpr-compliance": "/privacy",
};

const PUBLIC_FILE = /\.(.*)$/;

function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    process.env.API_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:4000"
  );
}

function normalizeNextPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/account";
  return pathname;
}

async function hasAllowedAccountSession(request: NextRequest) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { user?: { role?: string } };
    };
    const role = json.data?.user?.role;
    return json.ok === true && (role === "PATIENT" || role === "ADMIN");
  } catch {
    return false;
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
    "/terms-and-conditions",
    "/privacy-policy",
    "/copy-of-privacy-policy",
    "/refund-policy",
    "/gdpr-compliance",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
