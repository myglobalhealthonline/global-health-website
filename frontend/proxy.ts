import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/routing/get-request-context";

/**
 * Legacy → editorial URL map. Old Wix-style country routes are 308'd
 * (permanent, method-preserving) to the new `/{country}/...` hierarchy so
 * existing links and search equity transfer cleanly.
 */
const redirectMap: Record<string, string> = {
  // Country homes
  "/home": "/ireland",
  "/home-pt": "/portugal",
  "/home-sp": "/spain",
  "/home-cz": "/czechia",
  "/home-rm": "/romania",

  // Team listings
  "/ireland-team": "/ireland/team",
  "/portugal-team": "/portugal/team",
  "/spain-team": "/spain/team",
  "/czechia-team": "/czechia/team",
  "/romania-team": "/romania/team",

  // General consultation listings
  "/general-consultation-ie": "/ireland/services",
  "/general-consultation-pt": "/portugal/services",
  "/general-consultation-sp": "/spain/services",
  "/general-consultation-cz": "/czechia/services",
  "/general-consultation-rm": "/romania/services",

  // Specialist listings
  "/specialty-ie": "/ireland/specialists",
  "/specialty-pt": "/portugal/specialists",
  "/specialty-sp": "/spain/specialists",
  "/specialty-cz": "/czechia/specialists",
  "/specialty-rm": "/romania/specialists",
};

const PUBLIC_FILE = /\.(.*)$/;

/**
 * Prefix rewrites for dynamic legacy routes — doctor profiles and service
 * detail pages move into `/{country}/team/[doctorSlug]` and
 * `/{country}/services/[serviceSlug]` respectively. Returns the new path
 * or `null` when no match applies.
 */
function matchLegacyPrefix(pathname: string): string | null {
  const teamMap: Array<[RegExp, string]> = [
    [/^\/ireland-team\/(.+)$/, "/ireland/team"],
    [/^\/portugal-team\/(.+)$/, "/portugal/team"],
    [/^\/spain-team\/(.+)$/, "/spain/team"],
    [/^\/czechia-team\/(.+)$/, "/czechia/team"],
    [/^\/romania-team\/(.+)$/, "/romania/team"],
    [/^\/ireland-doctors\/(.+)$/, "/ireland/team"],
  ];
  for (const [re, prefix] of teamMap) {
    const m = pathname.match(re);
    if (m) return `${prefix}/${m[1]}`;
  }

  // Service detail: only redirect when the second segment is NOT a reserved
  // subpath (team/services/specialists) — those are the new structure itself.
  const RESERVED = new Set(["team", "services", "specialists"]);
  const irelandMatch = pathname.match(/^\/ireland\/([^/]+)$/);
  if (irelandMatch && !RESERVED.has(irelandMatch[1])) {
    return `/ireland/services/${irelandMatch[1]}`;
  }
  const specialistMatch = pathname.match(/^\/ireland-specialist-consultations\/(.+)$/);
  if (specialistMatch) {
    return `/ireland/services/${specialistMatch[1]}`;
  }

  return null;
}

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
    // 308 keeps the request method + signals permanent move so search
    // engines transfer ranking to the new editorial URL.
    return NextResponse.redirect(url, 308);
  }

  // Prefix redirects for legacy dynamic routes → new /{country}/... hierarchy.
  const prefixRedirect = matchLegacyPrefix(pathname);
  if (prefixRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = prefixRedirect;
    return NextResponse.redirect(url, 308);
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
