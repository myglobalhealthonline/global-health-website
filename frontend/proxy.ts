import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify, importSPKI, type JWTPayload } from "jose";
import { getRequestContext } from "@/lib/routing/get-request-context";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { PROD_SITE_URL } from "@/lib/seo/site-url";
import { isGonePath } from "@/lib/seo/gone-content";
import { countries } from "@/data/countries";

/**
 * Frontend edge proxy.
 *
 * Responsibilities (post-legacy cleanup):
 *   1. Auth-gate `/account/*` and `/admin/*` and `/doctor/*` by
 *      verifying the JWT cookie LOCALLY in the edge runtime. Previously
 *      we called the backend's `/api/auth/me` on every nav — measurable
 *      TTFB cost per internal link.
 *
 *      S-012 / SEC-004: the frontend holds ONLY the RS256 PUBLIC verification
 *      key (`AUTH_JWT_PUBLIC_KEY`), never the private signing key and no shared
 *      secret — so a frontend compromise can verify sessions but can NEVER mint
 *      backend tokens. Verification is RS256-ONLY; the legacy HS256 shared-secret
 *      fallback was removed. See `backend/src/utils/auth-session.ts`
 *      (`verifyWithRotation`) for the matching logic.
 *
 *      A backend round-trip still happens on every authenticated API
 *      request — this only skips it at navigation time.
 *
 *   2. Stamp `x-gh-country`, `x-gh-locale`, `x-gh-pathname` request
 *      headers so downstream RSCs can read locale context.
 */
const PUBLIC_FILE = /\.(.*)$/;

// SEO audit Phase 4 #2 — bare `/{country}/` with a trailing slash.
const COUNTRY_TRAILING_SLASH_RE = /^\/([a-z0-9-]+)\/$/;

// Permanently removed entities (410 Gone). The list and the matcher that keeps
// `next.config.ts` from 308ing these onto a dead URL both live in one place —
// see lib/seo/gone-content.ts for why they have to agree.
const GONE_BODY = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><title>Page removed</title></head>
<body><h1>Page removed</h1><p>This profile is no longer available.</p></body></html>`;

// Railway keeps its auto-generated `*.up.railway.app` domain publicly reachable
// even after a custom domain is attached, and site-url.ts self-canonicalizes to
// whatever host NEXT_PUBLIC_SITE_URL resolves to — so that domain is a fully
// indexable duplicate of the whole site unless we say otherwise. noindex it
// rather than redirect: a hard redirect would also hit legitimate non-prod
// Railway environments (staging clones) that share the same domain suffix.
const CANONICAL_HOST = new URL(PROD_SITE_URL).host;

// Content-Security-Policy (S-010 / MED-5 — see docs/audits/security/security-audit-2-2026-07-10.md, workstream W6).
//
// Two policies, one per rendering mode, because a per-request nonce is
// fundamentally incompatible with static output (Next stamps nonces only during
// dynamic server rendering; a build-time page's scripts would carry no nonce and
// modern browsers, which ignore 'unsafe-inline' once a nonce is present, would
// BLOCK all JS):
//
//   • Public documents (the (site) group + login/register etc.): the full
//     ENFORCING `publicCsp()` below — default/script/style/img/font/connect/
//     frame/form-action, built from the hosts the public site actually uses
//     (Doctify review widgets, Meta Pixel, GA4, the free stock-image hosts,
//     the backend API/media origin), on top of the same baseline. Its
//     `script-src 'self' 'unsafe-inline' <hosts>` is host-allowlisted but
//     inline-permissive — the only shape compatible with statically generated
//     pages, and the `[country]/[lang]` subtree now prerenders (P-001).
//
//     Both policies are emitted HERE, not from `next.config.ts headers()`,
//     because this proxy sets the `Content-Security-Policy` response header on
//     every document — anything `headers()` emits under that key is silently
//     overwritten. (The old Report-Only header coexisted only by having a
//     different key.)
//
//     MED-5 — the plan previously recorded here (ship Report-Only, derive
//     hashes for the inline scripts, then flip to enforce) is a DEAD END and
//     has been removed. A public page ships ~12 inline <script> tags and 10 of
//     them are `self.__next_f.push(...)` React Server Component flight
//     payloads: those bytes are page CONTENT. They differ per page and change
//     on every CMS edit, so a hash allowlist over them goes stale silently and
//     breaks that page's JavaScript with nothing surfaced. Do not re-attempt
//     hashing. The only two real options are:
//
//       A — nonce public pages like the portals. REJECTED: a nonce must be
//           minted per request, so the pages must be server-rendered on every
//           hit. With P-001 landed this is actively breaking (prerendered
//           scripts carry no nonce → all public JS blocked), not a trade-off.
//       B — chosen: enforce every directive except inline script, i.e. keep
//           'unsafe-inline' in script-src. No inline-XSS protection on public
//           pages, but the host allowlist, form-action, frame-src, object-src
//           and base-uri lockdowns are all real and enforced. Public pages are
//           marketing content; PHI lives behind the portals, which get the
//           strict nonce policy below.
//
//     Revisit A only if public pages ever return to dynamic rendering.
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
// Both enforcing policies are ON by default (W6 portals, MED-5 public). Kill
// switch: set DISABLE_NONCE_CSP=true to fall back to the bare baseline
// everywhere if any page is ever found to hydrate with CSP console errors in
// production. The baseline (frame-ancestors/object-src/base-uri) still ships.
const NONCE_CSP_ENABLED = process.env.DISABLE_NONCE_CSP !== "true";

/** Public-site policy. No nonce anywhere in it — must stay valid for
 *  prerendered HTML. See the MED-5 block comment above. */
function publicCsp(): string {
  const media = API_ORIGIN ? ` ${API_ORIGIN}` : "";
  return [
    "default-src 'self'",
    // Doctify injects <script src> at runtime; Meta Pixel loads fbevents.js;
    // GA4 loads gtag.js from googletagmanager.com. 'unsafe-inline' is forced by
    // the prerendered RSC flight payloads — see the block comment above.
    //
    // Doctify is wildcarded because its loader (www.doctify.com/get-script)
    // renders INTO our DOM — unlike the rating strip, which is an iframe with
    // its own CSP context — so any CDN subdomain it pulls from hits this
    // policy. Pinning www only would fail silently: the reviews just stop
    // rendering, with nothing surfaced outside the console.
    // Microsoft Clarity loads its recorder from www.clarity.ms/tag/<id>; the
    // wildcard covers the CDN subdomains that tag pulls from.
    // The ElevenLabs convai widget is loaded from unpkg
    // (components/integrations/ElevenLabsConvai.tsx). Like Doctify's loader it
    // renders INTO our DOM (a custom element with a shadow root), so its own
    // fetches hit this policy rather than an iframe's — see connect-src/
    // media-src below. Omitting the host fails silently: the custom element
    // stays undefined and NOTHING renders, no visible error.
    //
    // `blob:` is there for the same widget's AudioWorklet: it builds its
    // rawAudioProcessor worklet from a Blob URL, and a worklet module fetch is
    // checked against script-src (worker-src does not cover it). Without it the
    // launcher renders and looks fine until someone starts a call, which then
    // fails with "Failed to load the rawAudioProcessor worklet module … you may
    // need to self-host the worklet files". Loosening: any blob: script may
    // execute on PUBLIC pages, which already carry 'unsafe-inline' — so this
    // grants an attacker with script execution nothing new. The portal policy
    // (nonceCsp, where PHI lives) is deliberately NOT given blob:.
    "script-src 'self' 'unsafe-inline' https://*.doctify.com https://connect.facebook.net https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://unpkg.com blob:",
    // Tailwind + CMS emit inline <style>; keep permissive (style injection is
    // low value to an attacker relative to the breakage risk).
    "style-src 'self' 'unsafe-inline'",
    // `https:` rather than a host list: the CMS body sanitizer
    // (lib/content/sanitize-page-body.ts) allows <img src> from ANY https host
    // by design, so an allowlist here would blank out editor-inserted images in
    // blog/page bodies with no warning. CSP was never the control on that
    // vector — the sanitizer is — and img-src buys little against an attacker
    // who already has script execution.
    `img-src 'self' data: blob: https:${media}`,
    "font-src 'self' data: https://*.doctify.com",
    // There was no worker-src, so the fallback chain was child-src →
    // default-src 'self', which blocks the Blob-URL worker Clarity uses to
    // batch uploads. The failure mode is silent degradation, not a console
    // error, so this is set explicitly. It grants nothing meaningful: a blob
    // worker can only run script the page already produced, and script-src
    // here already carries 'unsafe-inline'.
    "worker-src 'self' blob:",
    // google-analytics.com/region1.google-analytics.com carry the gtag
    // measurement beacons (region1 = EU data-residency endpoint);
    // *.analytics.google.com + stats.g.doubleclick.net carry the Google
    // Signals ones, which fail silently if omitted.
    //
    // Clarity is wildcarded because its ingest endpoints are rotating
    // single-letter subdomains (a./b./c./e./f.clarity.ms) — pinning
    // c.clarity.ms would break intermittently and only in production.
    //
    // https://c.bing.com is DELIBERATELY ABSENT. It carries the MUID
    // advertising-identity sync with Microsoft Advertising, which no Clarity
    // analytics function needs. Expect a connect-src violation line in the
    // console on Clarity pages if it tries — that is the block working, not a
    // bug to fix by adding the host. (Note img-src is already `https:`, so a
    // pixel-shaped beacon cannot be blocked by CSP at all; the real control is
    // ad_Storage:"denied" via consentv2 in MicrosoftClarity.tsx.)
    // ElevenLabs convai: the widget fetches its agent config over https and
    // then runs the conversation itself over a socket — api.elevenlabs.io for
    // both, plus the LiveKit cloud edge the WebRTC transport dials. wss: is
    // listed explicitly because connect-src does NOT treat a wss:// URL as
    // covered by its https:// host entry.
    `connect-src 'self' https://*.doctify.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://region1.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net https://*.clarity.ms https://api.elevenlabs.io https://*.elevenlabs.io wss://api.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud${media}`,
    // The widget plays agent speech from a MediaStream / Blob URL. Without an
    // explicit media-src this fell back to default-src 'self', which blocks
    // blob: audio — the widget would open, listen, and then be mute.
    "media-src 'self' blob: data: https://*.elevenlabs.io",
    // Doctify rating strips render in <iframe> from doctify.com; convai renders
    // in-page, but some widget builds isolate the session in an iframe.
    "frame-src 'self' https://*.doctify.com https://*.elevenlabs.io",
    `form-action 'self'${media}`,
    CSP_BASE,
  ].join("; ");
}

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
 * Verify the cookie against the RS256 public key. RS256 is the SOLE accepted
 * algorithm (SEC-004): the frontend holds no shared secret and no signing key,
 * so it can verify sessions but never mint them. Mirrors the backend's
 * `verifyWithRotation`. Returns the decoded payload or null.
 */
async function verifyWithRotation(
  token: string,
  publicKey: PublicKey,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["RS256"],
    });
    return payload;
  } catch {
    // Not a valid RS256 token.
  }
  return null;
}

async function resolveSession(request: NextRequest): Promise<SessionLookup> {
  const publicKey = await getJwtPublicKey();
  if (!publicKey) {
    // The edge check is only an optimization. When the frontend env lacks the
    // RS256 public verification key, fall back to the server-side auth fetches
    // used by the layouts/pages instead of hard-failing navigation.
    //
    // This keeps logout and role-gated redirects working even if only the
    // frontend service is missing the key, while the backend remains the source
    // of truth for the actual session.
    return { kind: "misconfigured" };
  }
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { kind: "ok", role: null, email: null };
  const payload = await verifyWithRotation(token, publicKey);
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
 * Handle a `misconfigured` edge session (AUTH_JWT_PUBLIC_KEY not set on the
 * frontend) for a protected route.
 * Defense-in-depth: in production we fail CLOSED — log loudly and redirect to
 * login rather than silently passing unauthenticated traffic through to the
 * protected page tree. In development we pass through so a missing local key
 * doesn't block work.
 */
function handleMisconfiguredSession(request: NextRequest, pathname: string) {
  console.error(
    "[proxy] no JWT verification key (AUTH_JWT_PUBLIC_KEY) set — edge auth disabled for",
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

  // Permanently removed content — answer 410 Gone here and stop.
  //
  // Must run BEFORE the trailing-slash block and before `next.config.ts`
  // `redirects()`, because the broad `/{country}-doctors/:slug` rule would
  // otherwise 308 a retired profile onto a URL that then 404s:
  //     /ireland-doctors/<slug>  ->  308  ->  /ireland/en/doctors/<slug>  ->  404
  // Two hops to say "gone", and the 308 asserts a live successor that does not
  // exist. A direct 410 says it once, and Google drops a 410 faster than a 404.
  //
  // Middleware runs earlier in the pipeline than `redirects()` — the same
  // ordering the trailing-slash block below relies on, verified empirically
  // (see next.config.ts `skipTrailingSlashRedirect`).
  if (isGonePath(pathname)) {
    return new NextResponse(GONE_BODY, {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Never let a CDN hold a 410 open longer than a correction would take.
        "cache-control": "public, max-age=300",
        "x-robots-tag": "noindex",
      },
    });
  }

  // Trailing-slash handling, reimplemented here now that `skipTrailingSlashRedirect`
  // (next.config.ts) turns off Next's own automatic redirect. That redirect used
  // to fire BEFORE this proxy ever ran — confirmed empirically, `/ireland/` never
  // even reached this function — which made it impossible to collapse the
  // country-home case (`/ireland/` -> `/ireland` -> `/ireland/en`, 2 hops) into
  // one hop from either `next.config.ts` `redirects()` or here. Every other
  // trailing-slash path gets the same 308-strip Next used to do automatically
  // (below), so this is a "who handles it" change, not a behavior change, for
  // everything except the country-home case.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const countryMatch = COUNTRY_TRAILING_SLASH_RE.exec(pathname);
    const country = countryMatch ? countries.find((c) => c.slug === countryMatch[1]) : null;
    if (country) {
      // Mirrors `app/(redirect)/[country]/page.tsx`'s own `?lang=` handling:
      // an explicit request for a supported locale is a temporary (307)
      // redirect (the target varies per visitor), the plain country ->
      // default-locale mapping is permanent (308). Only covers the
      // statically seeded markets (`data/countries.ts`) — admin-added
      // countries have no bare `/{slug}/` link anywhere on the site to
      // trigger this and fall through to the generic strip below, same
      // 2-hop result as before.
      const requested = request.nextUrl.searchParams.get("lang")?.toLowerCase() ?? null;
      const requestedSupported =
        !!requested && country.supportedLocales.some((l) => l.toLowerCase() === requested);
      const lang = requestedSupported ? requested! : (country.defaultLocale ?? "EN").toLowerCase();
      // Built via `new URL()` rather than `request.nextUrl.clone()` +
      // `.pathname =` — NextURL silently re-appends the trailing slash it
      // was carrying from the original request when serialized (confirmed
      // empirically: `.pathname` reads back correctly but `.toString()` /
      // the Location header still has it), which is the whole reason this
      // block exists. A plain WHATWG URL doesn't carry that state.
      const oneHopUrl = new URL(`/${country.slug}/${lang}`, request.url);
      return NextResponse.redirect(oneHopUrl, requestedSupported ? 307 : 308);
    }
    const strippedPath = pathname.replace(/\/+$/, "") || "/";
    const strippedUrl = new URL(strippedPath + request.nextUrl.search, request.url);
    return NextResponse.redirect(strippedUrl, 308);
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
  // header too so Next can extract the nonce for its own scripts; the
  // enforcing public policy (no nonce, static-safe) for every other document.
  // Exactly one CSP header is emitted per request; next.config.ts sets none.
  let csp = NONCE_CSP_ENABLED ? publicCsp() : CSP_BASE;
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

  const host = request.headers.get("host") ?? "";
  if (host !== CANONICAL_HOST && host.endsWith(".up.railway.app")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  // Persist the URL-carried locale so locale-less shared pages (/about,
  // /blog, /contact, /faq) keep the language the visitor was browsing in.
  // Without this the cookie is only ever written by an explicit language-
  // switcher click, and navigating off a /{country}/{lang} page falls back
  // to Accept-Language (usually English).
  // ...but ONLY on a real top-level navigation. Next's `<Link>` prefetches and
  // client-side RSC fetches hit this proxy too, and their responses' Set-Cookie
  // is applied by the browser all the same — so a portal page merely RENDERING
  // a link into a `/{country}/{lang}` route (e.g. the patient portal's "Book
  // consultation" CTA, whose lang is the country default) silently retagged the
  // visitor's language without a single click. Prefetching a link is not a
  // language choice.
  const isDocumentNavigation =
    request.headers.get("sec-fetch-dest") === "document" ||
    (!request.headers.has("sec-fetch-dest") &&
      !request.headers.has("rsc") &&
      !request.headers.has("next-router-prefetch"));

  if (
    isDocumentNavigation &&
    context.pathLocale &&
    context.pathLocale !== request.cookies.get("gh_locale")?.value
  ) {
    response.cookies.set("gh_locale", context.pathLocale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }

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
