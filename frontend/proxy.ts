import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/routing/get-request-context";

/**
 * Phase 1 country → default locale map. Source of truth lives in the Country
 * model (`defaultLocale`); this proxy mirror is fine because there are five
 * countries and changes are rare. Keep this in sync with `data/countries.ts`.
 */
const COUNTRY_DEFAULT_LOCALE: Record<string, string> = {
  ireland: "en",
  portugal: "pt",
  spain: "es",
  czechia: "cs",
  romania: "ro",
};

function withLang(countrySlug: string, suffix: string = ""): string {
  const lang = COUNTRY_DEFAULT_LOCALE[countrySlug] ?? "en";
  return `/${countrySlug}/${lang}${suffix}`;
}

/**
 * Legacy → editorial URL map. Old Wix-style country routes are 308'd
 * (permanent, method-preserving) to the new `/{country}/{lang}/...` hierarchy.
 *
 * Phase 1 target shape:
 *   Country home      → /{country}/{lang}
 *   Doctors listing   → /{country}/{lang}/doctors
 *   Doctor profile    → /{country}/{lang}/doctors/{slug}
 *   General consult   → /{country}/{lang}/general-consultation
 *   Specialist        → /{country}/{lang}/specialist-consultation
 *   Booking           → /{country}/{lang}/book-online
 */
const redirectMap: Record<string, string> = {
  // Country homes — both Wix legacy and intermediate /{country} root
  "/home": withLang("ireland"),
  "/home-pt": withLang("portugal"),
  "/home-sp": withLang("spain"),
  "/home-cz": withLang("czechia"),
  "/home-rm": withLang("romania"),
  // Intermediate (pre-[lang]) routes — keep redirect for old links cached by Google
  "/ireland/team": withLang("ireland", "/doctors"),
  "/portugal/team": withLang("portugal", "/doctors"),
  "/spain/team": withLang("spain", "/doctors"),
  "/czechia/team": withLang("czechia", "/doctors"),
  "/romania/team": withLang("romania", "/doctors"),
  "/ireland/services": withLang("ireland", "/general-consultation"),
  "/portugal/services": withLang("portugal", "/general-consultation"),
  "/spain/services": withLang("spain", "/general-consultation"),
  "/czechia/services": withLang("czechia", "/general-consultation"),
  "/romania/services": withLang("romania", "/general-consultation"),
  "/ireland/specialists": withLang("ireland", "/specialist-consultation"),
  "/portugal/specialists": withLang("portugal", "/specialist-consultation"),
  "/spain/specialists": withLang("spain", "/specialist-consultation"),
  "/czechia/specialists": withLang("czechia", "/specialist-consultation"),
  "/romania/specialists": withLang("romania", "/specialist-consultation"),

  // Team listings (Wix slugs)
  "/ireland-team": withLang("ireland", "/doctors"),
  "/portugal-team": withLang("portugal", "/doctors"),
  "/spain-team": withLang("spain", "/doctors"),
  "/czechia-team": withLang("czechia", "/doctors"),
  "/romania-team": withLang("romania", "/doctors"),

  // General consultation listings (Wix slugs)
  "/general-consultation-ie": withLang("ireland", "/general-consultation"),
  "/general-consultation-pt": withLang("portugal", "/general-consultation"),
  "/general-consultation-sp": withLang("spain", "/general-consultation"),
  "/general-consultation-cz": withLang("czechia", "/general-consultation"),
  "/general-consultation-rm": withLang("romania", "/general-consultation"),

  // Specialist listings (Wix slugs)
  "/specialty-ie": withLang("ireland", "/specialist-consultation"),
  "/specialty-pt": withLang("portugal", "/specialist-consultation"),
  "/specialty-sp": withLang("spain", "/specialist-consultation"),
  "/specialty-cz": withLang("czechia", "/specialist-consultation"),
  "/specialty-rm": withLang("romania", "/specialist-consultation"),

  // Global booking → Ireland default (Phase 1 booking is country+lang scoped)
  "/book-online": withLang("ireland", "/book-online"),
};

const PUBLIC_FILE = /\.(.*)$/;

/**
 * Prefix rewrites for dynamic legacy routes — doctor profiles and service
 * detail pages move into `/{country}/team/[doctorSlug]` and
 * `/{country}/services/[serviceSlug]` respectively. Returns the new path
 * or `null` when no match applies.
 */
function matchLegacyPrefix(pathname: string): string | null {
  // Wix-shape doctor profile slugs → /{country}/{lang}/doctors/{slug}
  const teamMap: Array<[RegExp, string]> = [
    [/^\/ireland-team\/(.+)$/, "ireland"],
    [/^\/portugal-team\/(.+)$/, "portugal"],
    [/^\/spain-team\/(.+)$/, "spain"],
    [/^\/czechia-team\/(.+)$/, "czechia"],
    [/^\/romania-team\/(.+)$/, "romania"],
    [/^\/ireland-doctors\/(.+)$/, "ireland"],
  ];
  for (const [re, country] of teamMap) {
    const m = pathname.match(re);
    if (m) return withLang(country, `/doctors/${m[1]}`);
  }

  // Intermediate-shape doctor profile (pre-lang): /{country}/team/{slug}
  const intermediateTeam = pathname.match(/^\/(ireland|portugal|spain|czechia|romania)\/team\/(.+)$/);
  if (intermediateTeam) {
    return withLang(intermediateTeam[1], `/doctors/${intermediateTeam[2]}`);
  }

  // Intermediate-shape doctors slug (without /team/) for Ireland legacy
  const intermediateSlug = pathname.match(/^\/(ireland|portugal|spain|czechia|romania)\/doctors\/(.+)$/);
  if (intermediateSlug) {
    return withLang(intermediateSlug[1], `/doctors/${intermediateSlug[2]}`);
  }

  // Country root (without lang) → country home with default locale.
  // Handled by the [country]/page.tsx redirect, but covered here as a fallback.
  const justCountry = pathname.match(/^\/(ireland|portugal|spain|czechia|romania)$/);
  if (justCountry) return withLang(justCountry[1]);

  // Wix /service-page/{slug} → for Phase 1 we redirect to the country's
  // general-consultation hub (deferred service detail pages stay offline).
  // The slug prefix tells us the country.
  const servicePage = pathname.match(/^\/service-page\/([^/]+)$/);
  if (servicePage) {
    const slug = servicePage[1];
    if (slug.startsWith("ie-")) return withLang("ireland", "/general-consultation");
    if (slug.startsWith("pt-")) return withLang("portugal", "/general-consultation");
    if (slug.startsWith("sp-")) return withLang("spain", "/general-consultation");
    if (slug.startsWith("cz-")) return withLang("czechia", "/general-consultation");
    if (slug.startsWith("ro-") || slug.startsWith("rm-")) {
      return withLang("romania", "/general-consultation");
    }
    // Prescription / generic Wix services without country prefix → Ireland (where they exist today)
    return withLang("ireland", "/general-consultation");
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
