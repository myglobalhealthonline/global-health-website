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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
