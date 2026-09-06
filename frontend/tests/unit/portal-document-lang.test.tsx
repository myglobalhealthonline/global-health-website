import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Batch 15 — A11Y-001: `<html lang>` on the portal root.
 *
 * WCAG 2.2 §3.1.1 *Language of Page* (Level A). `app/(portal)/layout.tsx` is
 * the ROOT layout (it owns `<html>`/`<body>`) for /account, /doctor,
 * /corporate, /login & friends, /pay, /print, /share and /unauthorized. It
 * emitted a hard-coded `lang="en"` while the account, doctor and corporate
 * portals render their copy in the signed-in user's `User.preferredLocale`,
 * which can be any of en/cs/de/es/pt/ro. A screen reader picks its speech
 * synthesizer from that attribute, so a Czech portal was announced with
 * English pronunciation rules.
 *
 * The invariants pinned here:
 *
 *  LANG-1  The locale-bearing portal roots emit the resolved portal locale,
 *          in the SERVER-RENDERED bytes — a no-JS client (curl, a crawler, a
 *          screen reader at first paint) must read the real language off the
 *          served HTML. No hydration-time patching.
 *  LANG-2  Every supported locale maps to its `<html lang>` value, matching
 *          case-insensitively, with an unsupported or missing value falling
 *          back to `en`.
 *  LANG-3  `/admin` and `/admin/**` stay English regardless of the user's
 *          preference, the cookie, Accept-Language or `x-gh-locale` — the
 *          admin layout loads no locale bundle, so its copy really is
 *          English-only. `/administrator` is NOT `/admin`.
 *  LANG-4  The public `[country]/[lang]` root keeps resolving its language
 *          from route params (never request headers), so its
 *          `generateStaticParams` prerender is untouched.
 *  LANG-5  The document shell stays one shared component, and resolving the
 *          portal locale adds no second `/api/auth/me` round-trip.
 *
 * Rendering is `renderToStaticMarkup`, the pattern already used by
 * `corporate-boundaries.test.tsx` and `table-row-navigation-a11y.test.tsx`.
 * All fixture data below is synthetic.
 */

/* ---------------------------------------------------------------- fixtures */

/** Mutated per test; read by the `next/headers` mock below. */
let requestHeaders: Record<string, string> = {};
/** What the (mocked) portal locale resolver returns for this request. */
let resolvedPortalLocale = "en";
/** How many times the resolver was consulted — proves /admin never asks. */
let localeResolverCalls = 0;

vi.mock("next/headers", () => ({
  headers: async () => new Headers(requestHeaders),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
  }),
}));

vi.mock("@/lib/i18n/get-portal-locale", () => ({
  getPortalLocale: vi.fn(async () => {
    localeResolverCalls += 1;
    return resolvedPortalLocale;
  }),
}));

// The banner is never rendered by this root (`cookieBanner={false}`), but the
// module is still imported by RootDocument and pulls in client-only hooks.
// The stub renders a MARKER rather than null: a stub returning null would make
// "the banner is absent" assert true even if the root started passing
// `cookieBanner`, which is a test that cannot fail.
const COOKIE_BANNER_MARKER = "cookie-banner-stub";
vi.mock("@/components/compliance/CookieBanner", () => ({
  CookieBanner: () => <div data-testid={COOKIE_BANNER_MARKER} />,
}));

vi.mock("@/components/layout/ScrollToTop", () => ({
  ScrollToTop: () => null,
}));

import { NextRequest, type NextResponse } from "next/server";
import { SignJWT, exportSPKI, generateKeyPair } from "jose";
import PortalRootLayout from "@/app/(portal)/layout";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { toHtmlLang } from "@/lib/i18n/html-lang";
import { toSupportedLocale } from "@/lib/i18n/resolve-locale";

const FRONTEND = path.resolve(__dirname, "..", "..");

/** Read normalized to LF — `.gitattributes` leaves these to git's autocrlf,
 *  so a Windows checkout hands back CRLF. */
const readSource = (...segments: string[]) =>
  readFileSync(path.join(FRONTEND, ...segments), "utf8").replace(/\r\n/g, "\n");

const PORTAL_LAYOUT = readSource("app", "(portal)", "layout.tsx");
const COUNTRY_LAYOUT = readSource("app", "[country]", "[lang]", "layout.tsx");
const ROOT_DOCUMENT = readSource("app", "_components", "RootDocument.tsx");

/* ------------------------------------------------- the real edge proxy */

// LANG-6 below drives the ACTUAL proxy so the pathname the layout reads is the
// one production stamps, not one this file wrote by hand. `proxy.ts` caches the
// imported verification key on first use, so the key has to be in the
// environment before the module evaluates — hence the dynamic import.
const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const KEY_BEFORE = process.env.AUTH_JWT_PUBLIC_KEY;
process.env.AUTH_JWT_PUBLIC_KEY = await exportSPKI(publicKey);
const { proxy } = await import("@/proxy");

// Restored rather than left set: Vitest reuses worker PROCESSES across files
// (module registries are isolated, `process.env` is not), so leaving a valid
// key behind would silently arm `resolveSession` for a later file that means to
// exercise the missing-key path.
afterAll(() => {
  if (KEY_BEFORE === undefined) delete process.env.AUTH_JWT_PUBLIC_KEY;
  else process.env.AUTH_JWT_PUBLIC_KEY = KEY_BEFORE;
});

type SessionRole = "PATIENT" | "ADMIN" | "DOCTOR" | "SUPER_ADMIN";

/** A synthetic session cookie. `example.test` is RFC 6761 reserved; no real
 *  address, and nothing here is printed. */
const sessionCookie = (role: SessionRole) =>
  new SignJWT({ role, email: "staff@example.test" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("global-health-backend")
    .setAudience("global-health-website")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

/** The request headers the proxy forwards downstream — Next encodes them as
 *  `x-middleware-override-headers` plus one `x-middleware-request-<name>` per
 *  value. `null` when the proxy answered or bypassed the request instead. */
function forwardedHeaders(response: NextResponse): Headers | null {
  const names = response.headers.get("x-middleware-override-headers");
  if (names === null) return null;
  const forwarded = new Headers();
  for (const name of names.split(",").map((n) => n.trim()).filter(Boolean)) {
    const value = response.headers.get(`x-middleware-request-${name}`);
    if (value !== null) forwarded.set(name, value);
  }
  return forwarded;
}

/** The `lang` attribute of the rendered `<html>` element. */
const htmlLangOf = (html: string) => html.match(/<html\b[^>]*\blang="([^"]*)"/)?.[1];

/** Server-render the portal ROOT layout for `pathname`, with `locale` as the
 *  resolved portal locale and optional extra request headers. */
async function renderPortalRoot(
  pathname: string,
  locale = "en",
  extraHeaders: Record<string, string> = {},
) {
  requestHeaders = { "x-gh-pathname": pathname, ...extraHeaders };
  resolvedPortalLocale = locale;
  const element = await PortalRootLayout({ children: <div id="probe" /> });
  return renderToStaticMarkup(element);
}

/**
 * Render the portal root the way production reaches it: run the real edge
 * proxy for `pathname`, then hand the layout exactly the request headers the
 * proxy forwarded. A hand-written `x-gh-pathname` proves the branch; only this
 * proves the branch is REACHABLE, which is the half Batch 15b had to fix.
 */
async function renderThroughProxy(
  pathname: string,
  options: { role?: SessionRole; locale?: string; spoof?: Record<string, string> } = {},
) {
  const request = new NextRequest(`https://www.myglobalhealth.online${pathname}`, {
    headers: new Headers({
      host: "www.myglobalhealth.online",
      "sec-fetch-dest": "document",
      ...options.spoof,
    }),
  });
  if (options.role) request.cookies.set(AUTH_COOKIE_NAME, await sessionCookie(options.role));

  const forwarded = forwardedHeaders(await proxy(request));
  if (forwarded === null) {
    throw new Error(`the proxy forwarded no request headers for ${pathname}`);
  }

  requestHeaders = Object.fromEntries(forwarded.entries());
  resolvedPortalLocale = options.locale ?? "en";
  const html = renderToStaticMarkup(await PortalRootLayout({ children: null }));
  return { html, forwarded, lang: htmlLangOf(html) };
}

beforeEach(() => {
  requestHeaders = {};
  resolvedPortalLocale = "en";
  localeResolverCalls = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------- LANG-1: locale surfaces */

describe("LANG-1 — locale-bearing portal roots emit the resolved locale", () => {
  const LOCALE_ROUTES: Array<[string, string]> = [
    ["/account", "/account"],
    ["/account/bookings", "/account and below"],
    ["/doctor", "/doctor"],
    ["/doctor/appointments/abc-123", "/doctor and below"],
    ["/corporate", "/corporate"],
    ["/corporate/employees", "/corporate and below"],
  ];

  for (const [pathname, label] of LOCALE_ROUTES) {
    it(`${label} renders <html lang> from the portal locale`, async () => {
      const html = await renderPortalRoot(pathname, "cs");
      expect(htmlLangOf(html)).toBe("cs");
    });
  }

  it("emits the language in the served bytes, with the children inside", async () => {
    const html = await renderPortalRoot("/account", "ro");
    // The attribute must be on the document the server sends, not applied by
    // a script afterwards — a no-JS reader gets no second chance.
    expect(html.startsWith("<html")).toBe(true);
    expect(htmlLangOf(html)).toBe("ro");
    expect(html).toContain('id="probe"');
  });

  it("keeps the cookie banner off the portal document", async () => {
    // S-027: portal routes load no analytics or marketing scripts, so there
    // is nothing for consent to gate. Unchanged by this batch — asserted
    // against the marker the stub renders, so flipping `cookieBanner` back on
    // would actually fail this.
    const html = await renderPortalRoot("/account", "pt");
    expect(html).not.toContain(COOKIE_BANNER_MARKER);
  });
});

/* ------------------------------------------- LANG-2: the full locale table */

describe("LANG-2 — every supported locale maps to its document language", () => {
  const SUPPORTED: Array<[string, string]> = [
    ["en", "en"],
    ["cs", "cs"],
    ["de", "de"],
    ["es", "es"],
    ["pt", "pt"],
    ["ro", "ro"],
  ];

  for (const [locale, expected] of SUPPORTED) {
    it(`${locale} maps to ${expected}`, async () => {
      const html = await renderPortalRoot("/account", locale);
      expect(htmlLangOf(html)).toBe(expected);
    });
  }

  const CASE_AND_REGION: Array<[string, string]> = [
    ["CS", "cs"],
    ["PT-BR", "pt"],
    ["ES-es", "es"],
    ["RO-RO", "ro"],
    ["De", "de"],
  ];

  for (const [raw, expected] of CASE_AND_REGION) {
    it(`matches case-insensitively and drops the region: ${raw} to ${expected}`, async () => {
      // Case folding and region stripping belong to the existing resolver
      // (`toHtmlLang`); this asserts the layout routes through it rather than
      // stamping the raw value.
      expect(toHtmlLang(raw)).toBe(expected);
      const html = await renderPortalRoot("/account", raw);
      expect(htmlLangOf(html)).toBe(expected);
    });
  }

  const UNDERSCORE_FORMS: Array<[string, string]> = [
    ["pt_PT", "pt"],
    ["cs_CZ", "cs"],
    ["ES_ES", "es"],
  ];

  for (const [raw, expected] of UNDERSCORE_FORMS) {
    it(`normalizes the POSIX underscore form upstream: ${raw} to ${expected}`, () => {
      // Asserted on `toSupportedLocale`, not on the rendered layout: the
      // underscore form is normalized where locale-ish strings actually enter
      // the chain (the cookie, Accept-Language, `x-gh-locale`), so what
      // `getPortalLocale()` hands this layout is already a bare `LocaleCode`.
      // Pinning it here keeps that upstream guarantee from quietly moving.
      expect(toSupportedLocale(raw)).toBe(expected);
    });
  }

  const UNSUPPORTED = ["fr", "zz", "", "  ", "klingon", "en-US-x-hack"];

  for (const raw of UNSUPPORTED) {
    it(`falls back to en for an unsupported value: ${JSON.stringify(raw)}`, async () => {
      const html = await renderPortalRoot("/account", raw);
      expect(htmlLangOf(html)).toBe("en");
    });
  }

  it("still renders when the pathname header is absent entirely", async () => {
    // Nothing stamps `x-gh-pathname` outside a proxied request, and a bare
    // `headers()` read must not throw or emit an empty attribute.
    requestHeaders = {};
    resolvedPortalLocale = "es";
    const html = renderToStaticMarkup(await PortalRootLayout({ children: null }));
    expect(htmlLangOf(html)).toBe("es");
  });
});

/* -------------------------------------------------- LANG-3: /admin English */

describe("LANG-3 — /admin and /unauthorized are English-only", () => {
  const ADMIN_PATHS = [
    "/admin",
    "/admin/",
    "/admin/patients",
    "/admin/patients/duplicates",
    "/admin/settings/reviews",
    "/admin/doctors/42/availability",
    // The 403 landing the admin and doctor layouts redirect a role-mismatched
    // user to. Its copy is hard-coded English with no locale bundle, so a
    // Czech-preference patient bounced off /admin must not be handed
    // `lang="cs"` wrapped around English words.
    "/unauthorized",
    "/unauthorized/",
  ];

  for (const pathname of ADMIN_PATHS) {
    it(`${pathname} emits lang="en" despite a cs preference`, async () => {
      const html = await renderPortalRoot(pathname, "cs");
      expect(htmlLangOf(html)).toBe("en");
    });
  }

  it("ignores x-gh-locale and Accept-Language on /admin too", async () => {
    const html = await renderPortalRoot("/admin/users", "ro", {
      "x-gh-locale": "pt",
      "accept-language": "de-DE,de;q=0.9",
    });
    expect(htmlLangOf(html)).toBe("en");
  });

  it("does not even consult the locale resolver on /admin", async () => {
    await renderPortalRoot("/admin/orders", "cs");
    expect(localeResolverCalls).toBe(0);
  });

  const NOT_ADMIN: Array<[string, string]> = [
    ["/administrator", "a different route that merely shares the prefix"],
    ["/admin-tools", "a hyphenated sibling"],
    ["/adminish", "a longer word"],
    ["/account/admin", "an admin segment that is not the first"],
    ["/doctor/admin-notes", "an admin prefix deeper in the path"],
    ["/unauthorized-appeal", "a hyphenated sibling of the 403 landing"],
  ];

  for (const [pathname, why] of NOT_ADMIN) {
    it(`${pathname} is NOT classified as /admin (${why})`, async () => {
      const html = await renderPortalRoot(pathname, "cs");
      expect(htmlLangOf(html)).toBe("cs");
    });
  }

  it("classifies /admin from the proxy-stamped pathname, not a query string", async () => {
    // `x-gh-pathname` is set (never merged) by proxy.ts on every matched
    // request, so a client-supplied value cannot reach the layout. A query
    // parameter is client-controlled and must not steer this.
    const html = await renderPortalRoot("/account?next=/admin", "cs");
    expect(htmlLangOf(html)).toBe("cs");
  });
});

/* ------------------------------------------- LANG-3b: authentication pages */

describe("LANG-3b — authentication pages follow the same fallback", () => {
  const AUTH_PATHS = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  for (const pathname of AUTH_PATHS) {
    it(`${pathname} renders the resolved locale, matching its own copy`, async () => {
      // These pages already call `getPageLocale()` to pick their copy bundle;
      // the document language must agree with the words on the page.
      const html = await renderPortalRoot(pathname, "pt");
      expect(htmlLangOf(html)).toBe("pt");
    });
  }
});

/* --------------------------------------- LANG-4: public root stays static */

describe("LANG-4 — the public country/lang root stays params-based", () => {
  it("derives <html lang> from the route param, not request headers", () => {
    expect(COUNTRY_LAYOUT).toContain("toHtmlLang(lang)");
  });

  it("does not import next/headers at all", () => {
    // Either dynamic API in a ROOT layout un-statics the whole tree below it
    // (P-001), which is exactly what `generateStaticParams` prerenders.
    // Asserted on the import, not on a `headers()` substring: the file's own
    // comments name both APIs while explaining why it avoids them.
    expect(COUNTRY_LAYOUT).not.toMatch(/from\s+"next\/headers"/);
  });

  it("keeps prerendering its country x locale matrix", () => {
    expect(COUNTRY_LAYOUT).toContain("export function generateStaticParams()");
  });

  it("does not import the portal locale resolver", () => {
    expect(COUNTRY_LAYOUT).not.toContain("get-portal-locale");
  });
});

/* ------------------------- LANG-5: one shell, no extra auth round-trip */

describe("LANG-5 — one document shell, no duplicated auth request", () => {
  it("keeps RootDocument as the single shared document component", () => {
    expect(PORTAL_LAYOUT).toContain("RootDocument");
    expect(COUNTRY_LAYOUT).toContain("RootDocument");
    expect(ROOT_DOCUMENT).toContain("<html lang={lang}");
  });

  it("resolves the locale through the shared portal resolver only", () => {
    expect(PORTAL_LAYOUT).toMatch(/from\s+"@\/lib\/i18n\/get-portal-locale"/);
    // A second resolver, or its own session lookup, would mean a second
    // `/api/auth/me` per navigation. Asserted on the imports and on the
    // absence of a fetch, not on bare substrings — the file's comments
    // explain the memoized chain by name.
    expect(PORTAL_LAYOUT).not.toMatch(/from\s+"@\/lib\/api\/server-auth"/);
    expect(PORTAL_LAYOUT).not.toMatch(/\bfetch\(/);
  });

  it("consults the locale resolver exactly once per portal render", async () => {
    await renderPortalRoot("/account", "cs");
    expect(localeResolverCalls).toBe(1);
  });

  it("keeps the session lookup React-cache memoized at its source", () => {
    const serverAuth = readSource("lib", "api", "server-auth.ts");
    const selectedLocale = readSource("lib", "i18n", "selected-locale.ts");
    expect(serverAuth).toContain("export const getServerAuthUser = cache(");
    // The locale chain must reuse that memo rather than fetching for itself.
    expect(selectedLocale).toContain("export const getSignedInLocale = cache(");
    expect(selectedLocale).toContain("getServerAuthUser()");
    expect(selectedLocale).not.toContain("/api/auth/me");
  });

  it("introduces no client component or hydration-time language patching", () => {
    expect(PORTAL_LAYOUT).not.toContain('"use client"');
    expect(PORTAL_LAYOUT).not.toContain("useEffect");
    expect(PORTAL_LAYOUT).not.toContain("documentElement.lang");
    // The one inline script the document ships must not touch `lang`.
    expect(ROOT_DOCUMENT).not.toContain("documentElement.lang");
    expect(ROOT_DOCUMENT).not.toContain(".lang=");
  });
});

/* ------------------------ LANG-6: the branch through the real proxy */

describe("LANG-6 — the pathname comes from the real proxy, dots and all", () => {
  /** As the app builds it: `encodeURIComponent` leaves `.` alone and turns
   *  `@` into `%40`. Synthetic address, RFC 6761 reserved TLD. */
  const DOTTED_PATIENT = "john.doe%40example.test";

  it("forces English on /admin/patients/{email} despite a cs preference", async () => {
    // The Batch 15b regression. `proxy.ts` used to short-circuit on
    // `PUBLIC_FILE = /\.(.*)$/` — a dot ANYWHERE — so this document was served
    // as if it were a file in /public: no `x-gh-pathname`, the layout fell back
    // to "/", and an admin with a Czech preference got `lang="cs"` wrapped
    // around the admin console's hard-coded English copy. (It also shipped with
    // no CSP, which was the more serious half.)
    const { lang, forwarded } = await renderThroughProxy(`/admin/patients/${DOTTED_PATIENT}`, {
      role: "ADMIN",
      locale: "cs",
    });
    expect(forwarded.get("x-gh-pathname")).toBe(`/admin/patients/${DOTTED_PATIENT}`);
    expect(lang).toBe("en");
  });

  it("follows the portal locale on /doctor/patients/{email}", async () => {
    // The doctor portal DOES load a locale bundle, so the same dotted shape
    // must resolve the other way — the fix must not blanket-English every
    // dotted portal route.
    const { lang, forwarded } = await renderThroughProxy(`/doctor/patients/${DOTTED_PATIENT}`, {
      role: "DOCTOR",
      locale: "cs",
    });
    expect(forwarded.get("x-gh-pathname")).toBe(`/doctor/patients/${DOTTED_PATIENT}`);
    expect(lang).toBe("cs");
  });

  it("does not classify /administrator/user.name as /admin", async () => {
    const { lang, forwarded } = await renderThroughProxy("/administrator/user.name", {
      locale: "cs",
    });
    expect(forwarded.get("x-gh-pathname")).toBe("/administrator/user.name");
    expect(lang).toBe("cs");
  });

  it("stamps a pathname on every portal route family, dotted or not", async () => {
    // "Missing header" must not be a state normal traffic can reach — that is
    // what made the dotted bypass invisible. The layout's `?? \"/\"` fallback
    // stays a belt-and-braces default, not the operating mode.
    const ROUTES: Array<[string, SessionRole | undefined]> = [
      ["/admin", "ADMIN"],
      [`/admin/patients/${DOTTED_PATIENT}`, "ADMIN"],
      ["/account/documents/report.2026", "PATIENT"],
      [`/doctor/patients/${DOTTED_PATIENT}`, "DOCTOR"],
      ["/corporate/employees/a.b%40example.test", undefined],
      ["/login", undefined],
      ["/unauthorized", undefined],
    ];
    for (const [pathname, role] of ROUTES) {
      const { forwarded } = await renderThroughProxy(pathname, { role, locale: "cs" });
      expect(forwarded.get("x-gh-pathname"), pathname).toBe(pathname);
    }
  });

  it("ignores a spoofed x-gh-pathname in both directions", async () => {
    // The proxy SETS the header, never merges, so a client cannot claim a
    // route family it is not on.
    const claimingAccount = await renderThroughProxy(`/admin/patients/${DOTTED_PATIENT}`, {
      role: "ADMIN",
      locale: "cs",
      spoof: { "x-gh-pathname": "/account" },
    });
    expect(claimingAccount.lang).toBe("en");

    const claimingAdmin = await renderThroughProxy("/account/documents/report.2026", {
      role: "PATIENT",
      locale: "cs",
      spoof: { "x-gh-pathname": "/admin" },
    });
    expect(claimingAdmin.lang).toBe("cs");
  });

  it("gives the dotted admin record a portal CSP and a nonce", async () => {
    // The bigger half of the same bug. Pinned here too so a future change to
    // the language rule cannot quietly reintroduce the bypass that caused it.
    const request = new NextRequest(
      `https://www.myglobalhealth.online/admin/patients/${DOTTED_PATIENT}`,
      { headers: new Headers({ host: "www.myglobalhealth.online", "sec-fetch-dest": "document" }) },
    );
    request.cookies.set(AUTH_COOKIE_NAME, await sessionCookie("SUPER_ADMIN"));
    const response = await proxy(request);
    expect(response.headers.get("content-security-policy")).toMatch(/script-src 'nonce-[^']+'/);
    expect(forwardedHeaders(response)?.get("x-nonce")).toBeTruthy();
  });
});
