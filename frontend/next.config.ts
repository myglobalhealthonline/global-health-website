import path from "node:path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { slugMatcherExcludingGone } from "./lib/seo/gone-content";

/**
 * Bundle analyzer — opt-in via `ANALYZE=true pnpm --filter frontend build`.
 * Writes interactive treemaps for client + server bundles to
 * `.next/analyze/` so we can hunt down accidental large deps.
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

function mediaRemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const patterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
    // Free stock hosts so admin-/CMS-entered Unsplash & Pexels image URLs
    // render through next/image (both licenses permit commercial use).
    // Bundled /public/images remain the shipped defaults.
    { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
  ];
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  let apiHost: string | undefined;
  if (raw) {
    try {
      const url = new URL(raw);
      apiHost = url.hostname.toLowerCase();
      patterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/api/media/**",
      });
    } catch {
      // ignore a malformed NEXT_PUBLIC_API_URL
    }
  }
  // `resolveTrustedAssetUrl()` (lib/content/asset-media-url.ts) also treats
  // every NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS entry as a trusted media host (the
  // storage bucket, or a Railway backend host that differs from
  // NEXT_PUBLIC_API_URL in this environment) — mirror them here too, or
  // next/image throws "hostname not configured" for a host the resolver
  // already considers safe.
  const extraHosts = process.env.NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS?.trim();
  if (extraHosts) {
    for (const host of extraHosts.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)) {
      if (host === apiHost) continue;
      patterns.push({ protocol: "https", hostname: host, pathname: "/api/media/**" });
    }
  }
  return patterns;
}

const remotePatterns = mediaRemotePatterns();
const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

// S-010 / MED-5 — Content-Security-Policy is deliberately NOT set in this file.
//
// It is emitted per-request by the edge proxy (`proxy.ts`) for BOTH the public
// site and the authenticated portals. A CSP here would be dead config: the
// proxy does `response.headers.set("Content-Security-Policy", …)` on every
// document, which overwrites whatever `headers()` emitted under the same key.
// (The Report-Only header that used to live here survived only because its key
// differed — it was never the enforcing path, and its stated plan of deriving
// hashes for Next's inline scripts is unworkable. Full reasoning in the CSP
// comment block at the top of `proxy.ts`. Do not re-add a CSP here.)
//
// Baseline security headers applied to every response. We ship the remaining
// high-value, no-breakage headers: clickjacking protection (X-Frame-Options;
// frame-ancestors lives in the proxy CSP), MIME sniffing off, HSTS, a tight
// referrer policy, and a locked-down Permissions-Policy.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // `microphone=(self)`, NOT `()`: the ElevenLabs convai widget
    // (components/integrations/ElevenLabsConvai.tsx) calls getUserMedia from our
    // own document, and `microphone=()` denies it to every origin including
    // ours — the widget would render and then fail to start a session.
    // `(self)` grants it to this origin only; cross-origin iframes still get
    // nothing, so a third-party frame cannot reach the mic. Camera, geolocation
    // and browsing-topics stay fully denied.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  // SEO audit Phase 4 #3 — the one missing header from an otherwise complete
  // set. `same-origin` (not `same-origin-allow-popups`) is safe here: Stripe
  // checkout is a full top-level `window.location.assign()` redirect, not a
  // popup (app/[country]/[lang]/checkout/_components/CheckoutPageClient.tsx);
  // every `window.open()` call in the app already passes `noopener` and only
  // opens PDFs/external report links that never read back `window.opener`;
  // the ElevenLabs convai widget is an embedded custom element, not a popup,
  // so COOP (which only isolates `window.open()` opener relationships)
  // doesn't touch it. There is no OAuth-popup flow anywhere in the frontend.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/**
 * The build's total concurrent load on the backend's connection pool is
 * `cpus x NEXT_BUILD_API_CONCURRENCY` (see frontend/lib/api/client.ts). That
 * product MUST stay under the backend's `pg` pool max of 10
 * (backend/src/db/prisma.ts) or reads start timing out at the 5s connect
 * window — which, since P-001, bakes empty doctor/plan lists into static
 * files rather than merely being slow.
 *
 * Two independent env knobs guarding one shared ceiling is a footgun: raising
 * either alone silently breaks the invariant, and the symptom (thin pages) is
 * indistinguishable from a content bug. So assert it here, at build start,
 * instead of discovering it in a deploy.
 */
const BACKEND_POOL_MAX = 10;
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || 4;
const buildApiConcurrency = Number(process.env.NEXT_BUILD_API_CONCURRENCY) || 2;
if (buildCpus * buildApiConcurrency >= BACKEND_POOL_MAX) {
  throw new Error(
    `NEXT_BUILD_CPUS (${buildCpus}) x NEXT_BUILD_API_CONCURRENCY ` +
      `(${buildApiConcurrency}) = ${buildCpus * buildApiConcurrency}, which is not below the ` +
      `backend pg pool max of ${BACKEND_POOL_MAX}. The build would saturate the pool and ` +
      `prerender pages with missing content. Lower one of the two, or raise the pool in ` +
      `backend/src/db/prisma.ts and this constant together.`,
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
  // SEO audit Phase 4 #2 — by default Next's trailingSlash:false behavior
  // 308-redirects a trailing-slash request BEFORE `proxy.ts` (middleware) or
  // this file's own `redirects()` ever run — confirmed empirically (neither
  // could intercept `/ireland/`; no request even reached proxy.ts). This
  // opts out of that automatic, un-interceptable redirect so `proxy.ts` can
  // own trailing-slash handling and collapse the country-home case straight
  // to `/{country}/{lang}` in one hop instead of two. See the trailing-slash
  // block at the top of `proxy()` for the reimplementation — every other
  // trailing-slash path still gets the same 308-strip Next used to do
  // automatically, so this is a "who handles it" change, not a behavior
  // change, for everything except the country-home case.
  skipTrailingSlashRedirect: true,
  // `/api/og` imports sharp. Under pnpm, sharp's native binding lives in
  // `@img/sharp-<platform>` and the libvips shared object in a SEPARATE
  // sibling package (`@img/sharp-libvips-<platform>`); standalone file
  // tracing only follows the first one. The Docker runner ships nothing but
  // the standalone output, so on Linux the route died at import with
  // `ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3` -> every og:image URL a
  // crawler fetched returned 500. Never reproduces on Windows/macOS, where
  // libvips is bundled inside the single platform package.
  // Both layouts are listed on purpose: pnpm flattens the scope into the
  // virtual-store directory name (`.pnpm/@img+sharp-linux-x64@0.35.3/...`),
  // while the symlink farm exposes the same files as `node_modules/@img/...`.
  outputFileTracingIncludes: {
    "/api/og": ["./node_modules/.pnpm/@img*/**/*", "./node_modules/@img/**/*"],
  },
  // Drop `X-Powered-By: Next.js` — free framework fingerprint for anyone
  // scanning the site (flagged by an external scan). No behaviour change.
  poweredByHeader: false,
  // ponytail: default 60s static-page timeout was too tight under the
  // 31-worker build concurrency (backend fetches are individually capped at
  // PUBLIC_CONTENT_FETCH_TIMEOUT_MS=4s, but queuing under load can still
  // blow past 60s for one page). Raise the ceiling; if a route is genuinely
  // hanging (not just queued), check backend logs for that build window.
  staticPageGenerationTimeout: 180,
  // Prerender worker count. Since P-001 the ~550 public pages are statically
  // generated, and every worker fetches the same backend concurrently — which
  // has a `pg` pool of max 10 with a 5s connect timeout (backend/src/db/
  // prisma.ts). At the default worker count the queue blows past that timeout
  // and reads fail with "timeout exceeded when trying to connect", which now
  // BAKES an empty doctor/plan list into a static file instead of just being
  // a slow request. Raising the DB pool was considered and rejected
  // separately (Postgres max_connections on the current plan), so the build
  // throttles itself instead. Builds are slower; they are also correct.
  experimental: {
    cpus: buildCpus,
    // Required now that there is no `app/layout.tsx` (each subtree owns its
    // own root layout so `[country]/[lang]` can emit the real `<html lang>`):
    // the `/_not-found` route has no root layout to render inside, so the 404
    // owns its own document via `app/global-not-found.tsx`.
    globalNotFound: true,
  },
  // Next streams <title>/<meta>/<link rel=canonical|alternate> after </head>
  // for any generateMetadata() that isn't ready before the shell flushes
  // (service/doctor pages awaited per-locale hreflang DB lookups — now
  // parallelized, see indexableServiceAlternates / doctorHreflangCluster, cut
  // 6-locale resolution from ~3.7-4.6s to ~0.7s). Googlebot's renderer parses
  // per the HTML spec and understands Next's streamed metadata, and nothing
  // here shows Google itself mis-reading these pages — so it deliberately
  // stays OUT of this list; only Screaming Frog SEO Spider is appended,
  // because its head-only extraction doesn't parse streamed tags at all.
  // Default regex this extends: node_modules/next/dist/shared/lib/router/utils/html-bots.js
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Screaming Frog SEO Spider/i,
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    // Next 16 only serves qualities declared here (default [75]) — 60 is
    // used by decorative hero backgrounds that sit under tint overlays.
    qualities: [60, 75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Next content-hashes everything under /_next/static (filename embeds
      // the build hash), so a stale cache is impossible — safe to cache for
      // a year as immutable. Production only: dev chunks are NOT hashed
      // (stable names like frontend_app_globals_….css), so `immutable` makes
      // the browser keep stale CSS/JS across edits and Next itself warns
      // this header breaks dev behavior.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
              ],
            },
          ]
        : []),
      // SEO-audit perf fix — CDN/edge caching for the anonymous-only public
      // marketing pages under `[country]/[lang]`. These document responses
      // were shipping the Next.js dynamic-render default
      // (`private, no-cache, no-store, must-revalidate`), forcing full
      // origin revalidation on every crawler/anonymous hit.
      //
      // Root cause (see backend investigation notes / PR description): every
      // page below is verified free of `cookies()`/`headers()`/`searchParams`
      // reads in its entire render tree (layouts included) — the header/nav
      // auth state is hydrated client-side post-mount (PublicAuthContext),
      // never read server-side, so the HTML byte-for-byte does NOT vary by
      // visitor. All their data reads already go through Next's Data Cache
      // (`revalidate: 60`/tags — see lib/api/site-content-api.ts), so the
      // underlying content is cache-coherent too. Despite that, this Next.js
      // 16/Turbopack build still classifies the whole `[country]/[lang]`
      // segment as dynamic (`ƒ`) in `next build`'s route table — verified via
      // a `dynamic = "error"` bisection that even a fully stripped page+layout
      // tree (zero dynamic-API calls anywhere) still gets flagged, so this
      // looks like a platform-level classification quirk tied to sibling
      // routes under the same segment (pricing/book/cart/checkout) that
      // *do* need per-request auth cookies, not a per-page bug. That's a
      // separate, deeper investigation — NOT attempted here.
      //
      // This header doesn't change that (the origin still re-renders on
      // every request that reaches it), but it lets any CDN/reverse-proxy in
      // front of the origin — and the browser — treat the response as
      // cacheable, which is exactly what the audit flagged as missing.
      // `max-age=0` keeps the browser itself always revalidating (so a user
      // never sees content older than they'd expect); `s-maxage=60` mirrors
      // the 60s origin data-cache window; `stale-while-revalidate=300` gives
      // a 5-minute grace window so a slow origin re-render never blocks a
      // cache hit. Deliberately EXCLUDES `/pricing` (reads the visitor's auth
      // session + active subscription — genuinely personalized, confirmed via
      // `getServerAuthUser`/`getServerSubscription`) and `/book`, `/cart`,
      // `/checkout*` — those keep the default no-store behavior.
      //
      // 2026-08-03 (SEO audit follow-up): `/legal*` was previously on that
      // excluded list as "unverified / auth-adjacent". It has now been
      // verified and moved onto the cacheable list below. All three legal
      // pages (`legal/page.tsx`, `legal/[type]/page.tsx`,
      // `legal/subscription-terms/page.tsx`) and every module in their import
      // trees (GH2PagePrimitives, JsonLd, get-country-legal,
      // sanitize-page-body, load-locale, country-slug, hreflang, page-seo,
      // structured-data) contain zero `cookies()`/`headers()`/`searchParams`/
      // `draftMode()` reads, and the `[country]/[lang]` layout above them is
      // already documented as static-generation-safe. The response is
      // byte-for-byte identical per visitor. Published legal documents also
      // change far less often than the 60s window.
      {
        source: "/:country/:lang",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source:
          "/:country/:lang/(gp-consultation-online|see-a-specialist|repeat-prescription-request|lab-tests|doctors|blog)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        // `health` added 2026-08-03 (SEO audit 2.4b/2.4c follow-up): the
        // route dropped `force-dynamic` after its whole import tree
        // (getCountryLandingPage/getCountryDoctors/getCountryTrust, same
        // cache()-wrapped fetches the already-cacheable routes above use)
        // was verified free of cookies()/headers()/searchParams/draftMode().
        source: "/:country/:lang/(lab-tests|doctors|blog|services|health)/:slug",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        // Free health tools. Same treatment as the routes above and for the
        // same reason: the copy is code-resident, the render reads route
        // params only (no cookies()/headers()/searchParams), and the
        // interactive part runs client-side — so the HTML is byte-for-byte
        // identical per visitor.
        source: "/:country/:lang/tools/:slug",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/:country/:lang/legal",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/:country/:lang/legal/:type",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      // 2026-08-03 (SEO audit 2.3 follow-up): the 7 root-level global pages
      // (`/`, `/about`, `/faq`, `/blog`, `/contact`, `/terms`, `/privacy` —
      // `app/(global)/*`) were investigated for the same treatment and
      // DELIBERATELY EXCLUDED — unlike `/:country/:lang*` above, they are
      // genuinely visitor-varying, not just flagged dynamic by the
      // build. Every one of them has no `[lang]` URL segment, so every call
      // to `getPageLocale()` in their render tree (page + metadata) falls
      // through with no `explicitLocale` straight into `getSelectedLocale()`
      // (`lib/i18n/selected-locale.ts`), which reads the `gh_locale` cookie,
      // the `x-gh-locale`/`Accept-Language` headers, and — for signed-in
      // visitors — `User.preferredLocale` from the DB, on every request. The
      // rendered HTML (hero copy, headings, FAQ answers, everything) is in
      // that resolved language, so two visitors hitting the same URL
      // genuinely get different bytes back. `/blog` additionally reads the
      // `gh-last-country` cookie to pick its "back to home" link. A shared
      // CDN cache keyed on the URL alone would serve one visitor's language
      // (or a stale signed-out visitor's copy to a signed-in one) to
      // everyone else. This is the opposite case from the country pages
      // above, where the `[lang]` URL segment IS the explicit locale, so
      // `getPageLocale(lang)` short-circuits before ever touching
      // `cookies()`/`headers()` and the HTML is byte-for-byte identical per
      // visitor. Do not add a Cache-Control override for these routes
      // without first removing or gating the `getSelectedLocale()` call.
      // Unhashed /public assets (icons, hero images, stock photos — see
      // public/) are NOT content-hashed: a redeploy can overwrite
      // public/foo.png at the same URL. `immutable` previously cached these
      // for a year, so an overwritten file never refreshed for repeat
      // visitors. short TTL + revalidate instead; still cheap since these
      // rarely change.
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
      // Overrides the rule above for the media proxy specifically: object
      // keys here (e.g. `doctor-<id>-profile`) are stable but NOT
      // content-hashed — admin re-uploads overwrite the same key/URL, so
      // `immutable, max-age=1yr` would keep serving the old image for a
      // year. Later entries win on a matching header key, so this must
      // stay after the extension-based rule.
      {
        source: "/api/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const dynamicRewrites = apiOrigin
      ? [
          {
            source: "/api/media/:path*",
            destination: `${apiOrigin}/api/media/:path*`,
          },
          // CSV export is a plain <a href> download link (not a fetch), so
          // it needs to hit a same-origin URL to carry the admin session
          // cookie automatically — proxy it to the backend like media above.
          {
            source: "/api/admin/audit-log/export",
            destination: `${apiOrigin}/api/admin/audit-log/export`,
          },
          // Invoice/receipt PDF download is a plain <a href> and the resend is
          // a client fetch — both need same-origin so the admin session cookie
          // rides along automatically. Proxy them to the backend.
          {
            source: "/api/admin/invoices/:invoiceId/pdf",
            destination: `${apiOrigin}/api/admin/invoices/:invoiceId/pdf`,
          },
          {
            source: "/api/admin/invoices/:invoiceId/resend",
            destination: `${apiOrigin}/api/admin/invoices/:invoiceId/resend`,
          },
          // NOTE: report-export + payout-invoice endpoints are proxied by
          // dedicated app/api route handlers (app/api/**/route.ts via
          // forwardStream), NOT rewrites — so they work regardless of
          // rewrite matching in a given deploy.
        ]
      : [];

    return {
      beforeFiles: [
        ...dynamicRewrites,
        {
          source: "/admin/doctors/new",
          destination: "/admin/doctors/create",
        },
        // Ads-safe public slugs — server resolves to the existing
        // template folders so we don't need to duplicate page code.
        // The matching `redirects()` block below 301s legacy URLs to
        // these new ones so SEO migrates cleanly.
        //
        // Final approved slug set (from product brief):
        //   GENERAL       → /gp-consultation-online
        //   SPECIALIST    → /see-a-specialist
        //   PRESCRIPTION  → /repeat-prescription-request
        //   HEALTH_TEST   → /lab-tests
        {
          source: "/:country/:lang/gp-consultation-online",
          destination: "/:country/:lang/general-consultation",
        },
        {
          source: "/:country/:lang/gp-consultation-online/:slug",
          destination: "/:country/:lang/general-consultation/:slug",
        },
        {
          source: "/:country/:lang/see-a-specialist",
          destination: "/:country/:lang/specialist-consultation",
        },
        {
          source: "/:country/:lang/see-a-specialist/:slug",
          destination: "/:country/:lang/specialist-consultation/:slug",
        },
        {
          source: "/:country/:lang/repeat-prescription-request",
          destination: "/:country/:lang/prescriptions",
        },
        {
          source: "/:country/:lang/repeat-prescription-request/:slug",
          destination: "/:country/:lang/prescriptions/:slug",
        },
        {
          source: "/:country/:lang/lab-tests",
          destination: "/:country/:lang/tests",
        },
        {
          source: "/:country/:lang/lab-tests/:slug",
          destination: "/:country/:lang/tests/:slug",
        },
        // Ireland internal-linking slug migration — expose the new GP service
        // slugs as clean top-level URLs (e.g. /ireland/en/acute-medical-consultation)
        // that render the generic service detail template. The matching
        // Service.slug rows must exist per country for the page to resolve.
        {
          source: "/:country/:lang/acute-medical-consultation",
          destination: "/:country/:lang/services/acute-medical-consultation",
        },
        {
          source: "/:country/:lang/chronic-disease-consultation",
          destination: "/:country/:lang/services/chronic-disease-consultation",
        },
        {
          source: "/:country/:lang/musculoskeletal-pain-assessment",
          destination: "/:country/:lang/services/musculoskeletal-pain-assessment",
        },
        {
          source: "/:country/:lang/mens-health-consultation",
          destination: "/:country/:lang/services/mens-health-consultation",
        },
        {
          source: "/:country/:lang/treatment-review",
          destination: "/:country/:lang/services/treatment-review",
        },
        {
          source: "/:country/:lang/referral-and-investigations",
          destination: "/:country/:lang/services/referral-and-investigations",
        },
        {
          source: "/:country/:lang/sick-certificate-ireland",
          destination: "/:country/:lang/services/sick-certificate-ireland",
        },
        {
          source: "/:country/:lang/respiratory-infections",
          destination: "/:country/:lang/services/respiratory-infections",
        },
      ],
    };
  },
  /**
   * 301 redirects for the Ads-safe service rename. Inbound traffic to
   * the historical `/general-consultation`, `/specialist-consultation`,
   * `/prescriptions`, `/tests` slugs is permanently moved to the new
   * Ads-policy-friendly URLs. Country/lang segments are preserved.
   *
   * The "interim" slugs from the first rename pass
   * (`/online-doctor-visit`, `/specialist-appointment`,
   * `/repeat-prescription`) are ALSO 301'd to the final set in case
   * any pre-launch test traffic / Ads preview-URL cached them. Cheap
   * insurance — no real visitors had those URLs.
   *
   * The query string is forwarded automatically by Next's redirect.
   */
  async redirects() {
    // Localized-slug migration (2026-07): PT/CZ/RO service slugs renamed
    // from English to default-locale slugs (backend
    // scripts/migrate-localized-service-slugs.ts holds the same map).
    // Old slugs are indexed — 301 them under both /services and /consult.
    const localizedSlugRenames: Record<string, Record<string, string>> = {
      portugal: {
        "cardiology-consultation": "consulta-cardiologia",
        "driving-license-medical-certificate": "certificado-medico-carta-de-conducao",
        "family-and-general-medicine": "medicina-geral-e-familiar",
        "hair-loss-consultation": "consulta-queda-de-cabelo",
        "medical-certificates-consultation": "certificados-medicos",
        "medical-consultation": "consulta-medica",
        "mens-health-consultation": "saude-do-homem",
        "mental-health-consultation": "saude-mental",
        // NOTE: no `nutrition-consultation` entry — the renamed PT slug
        // (`consulta-de-nutricao`) has no live Service row, so a rule aimed at
        // it is a 308→404. Both spellings get an explicit hub rule further
        // down instead.
        "oncology-consultation": "consulta-de-oncologia",
        "paediatric-primary-care-consultation": "pediatria-geral",
        "pain-management-consultation": "gestao-da-dor",
        "pediatric-consultation": "consulta-de-pediatria",
        "psychiatry-consultation": "consulta-de-psiquiatria",
        "psychology-consultation": "consulta-de-psicologia",
        "referral-consultation": "consulta-de-referenciacao",
        "second-opinion-consultation": "segunda-opiniao-medica",
        "sick-leave": "baixa-medica",
        "skin-dermatology-consultation": "consulta-dermatologia",
        "smoking-cessation-consultation": "deixar-de-fumar",
        "travelers-consultation": "consulta-do-viajante",
        "treatment-renewal": "renovacao-de-tratamento",
        "weight-loss-consultation": "perda-de-peso",
        "womens-health-consultation": "saude-da-mulher",
      },
      czechia: {
        "chronic-disease-management": "chronicka-onemocneni",
        "hair-loss-online": "vypadavani-vlasu-online",
        "mens-health-online": "muzske-zdravi-online",
        "mental-health-online": "dusevni-zdravi-online",
        "musculoskeletal-pain": "bolesti-pohyboveho-aparatu",
        "paediatric-gp-online": "detsky-lekar-online",
        "prague-doctor-online": "lekar-online-praha",
        "referrals-and-investigations": "doporuceni-a-vysetreni",
        "second-opinion-prague": "druhy-nazor-praha",
        "sick-note-czech-republic": "neschopenka-online",
        "skin-consultation-prague": "kozni-konzultace-praha",
        "travel-health-prague": "cestovni-medicina-praha",
        "treatment-renewal": "obnoveni-lecby",
        "weight-management-online": "kontrola-vahy-online",
        "womens-health-online": "zenske-zdravi-online",
      },
      romania: {
        "chronic-disease-romania": "boli-cronice-online",
        "hair-loss-romania": "caderea-parului-online",
        "mens-health-romania": "sanatatea-barbatului-online",
        "mental-health-romania": "sanatate-mintala-online",
        "musculoskeletal-pain-romania": "dureri-musculo-scheletice",
        "neurology-consultation-romania": "consultatie-neurologie",
        "online-doctor-romania": "medic-online-romania",
        "paediatric-gp-romania": "medic-pediatru-online",
        "referrals-and-investigations-romania": "trimiteri-si-investigatii",
        "second-opinion-romania": "a-doua-opinie-medicala",
        "skin-consultation-romania": "consultatie-dermatologica",
        "specialist-paediatrician-romania": "consultatie-pediatrie",
        "specialist-pain-assessment-romania": "evaluare-durere",
        "travel-health-romania": "medicina-calatoriei",
        "treatment-renewal-romania": "reinnoire-tratament",
        "weight-management-romania": "controlul-greutatii",
        "womens-health-romania": "sanatatea-femeii-online",
      },
    };
    // `/{country}/{lang}/consult/{slug}` is itself a permanentRedirect stub
    // (app/[country]/[lang]/consult/[serviceSlug]/page.tsx → /services/{slug}),
    // so BOTH sections must land on /services/ directly. Sending the consult
    // form to /consult/{newSlug} produced 308→308→200 on 56 rules.
    const localizedSlugRedirects = Object.entries(localizedSlugRenames).flatMap(
      ([countrySlug, map]) =>
        Object.entries(map).flatMap(([oldSlug, newSlug]) =>
          ["services", "consult"].map((section) => ({
            source: `/${countrySlug}/:lang/${section}/${oldSlug}`,
            destination: `/${countrySlug}/:lang/services/${newSlug}`,
            permanent: true,
          })),
        ),
    );
    // The six real locale codes. Every `/:country/:lang/…` rule below MUST
    // constrain `:lang` to this set: unconstrained it also matches the Wix
    // shape `/{locale}/{country}/{slug}` (reading /cs/portugal/tests as
    // country="cs", lang="portugal"), which rewrites into a second redirect
    // and turns one clean 308 into a 2-hop chain — or, where the destination
    // country hub does not exist, into 308→404.
    const LANG = "(en|pt|es|cs|ro|de)";
    // Destination-availability groups. `:country` is a wildcard, but several
    // destinations only exist in SOME markets — an unconstrained rule there is
    // a 308→404, which keeps the old URL in Google index as an error. Verified
    // against production per market:
    //   IE_ONLY  — the Ireland internal-linking slug migration. Those Service
    //              rows exist in Ireland alone, so the other five markets each
    //              got 7 chains into a 404.
    //   HAS_TESTS      — /lab-tests renders only in Ireland and Romania.
    //   HAS_SPECIALIST — /see-a-specialist is off in Czechia (documented
    //                    above) and Brazil.
    const IE_ONLY = "(ireland)";
    const HAS_TESTS = "(ireland|romania)";
    const HAS_SPECIALIST = "(ireland|portugal|spain|romania)";
    // NOTE — the trailing-slash double redirect (SEO audit Phase 4 #2,
    // `/ireland/` -> `/ireland` -> `/ireland/en`) is fixed in `proxy.ts`, not
    // here. A rule added here (`source: "/ireland/"`) never fires: Next's own
    // trailingSlash:false normalization strips the slash and 308s BEFORE this
    // redirects() config is ever evaluated (verified — a matching rule here
    // produced zero effect, confirmed via dev-server request logs showing no
    // custom-redirect hit for the slashed path). Middleware runs earlier in
    // the pipeline than that internal normalization, so the fix lives there.
    return [
      ...localizedSlugRedirects,
      // Retired /health/ landing pages (SEO audit, 2026-08-03). Placed FIRST
      // among the /:country/:lang rules so no broader pattern below can shadow
      // them — rule order is load-bearing here and has silently killed precise
      // rules in this file before.
      //
      // Keep in sync with HEALTH_RETIRED_REDIRECTS in
      // lib/seo/health-service-canonical.ts, which app/sitemap.ts reads to keep
      // the retired URLs out of the sitemap. The map cannot be imported here:
      // next.config.ts is evaluated before the module graph, so the paths are
      // written out literally and the map is the documented source of truth.
      //
      // ireland/international-students -> gp-consultation-online. The page held
      // position 4.8, the best of any /health/ page, but on 5 impressions and
      // 0 clicks in 90 days — a good position for a query almost nobody types.
      // An international student arriving in Ireland needs a GP, which the GP
      // consultation page serves far better than a 297-word explainer.
      {
        source: `/ireland/:lang${LANG}/health/international-students`,
        destination: "/ireland/:lang/gp-consultation-online",
        permanent: true,
      },
      // ireland/sick-cert-online -> services/sick-certificate-ireland. The
      // canonical tag already pointed here (2026-08-03 decision), but Google
      // kept the ES/RO variants independently indexed and ranking (168 impr /
      // avg pos 28.1, and 13 impr / avg pos 16.3, over 90 days) despite the
      // foreign canonical — a real redirect is needed to fully consolidate
      // the signal onto the service page. All 6 locale variants get the same
      // treatment for consistency (SEO ranking-growth batch, 2026-08-09).
      {
        source: `/ireland/:lang${LANG}/health/sick-cert-online`,
        destination: "/ireland/:lang/services/sick-certificate-ireland",
        permanent: true,
      },
      // portugal/atestado-medico-online -> services/baixa-medica. Same
      // failure mode as sick-cert-online above: the canonical tag already
      // pointed here (SEO audit 2.4b), but Google kept the ES/RO variants
      // independently indexed and ranking Portugal's own "atestado médico
      // online" query instead of the pt page or the service page (2026-08-11
      // ranking-growth batch). `:lang` is preserved so each locale redirects
      // to its own-locale service page, not a single hardcoded destination.
      {
        source: `/portugal/:lang${LANG}/health/atestado-medico-online`,
        destination: "/portugal/:lang/services/baixa-medica",
        permanent: true,
      },
      // No services index page exists — only /services/:slug. Send the bare
      // section URL to the country home instead of a 404.
      {
        source: `/:country/:lang${LANG}/services`,
        destination: "/:country/:lang",
        permanent: true,
      },
      {
        source: `/:country/:lang${LANG}/book-online`,
        destination: "/:country/:lang/book",
        permanent: true,
      },
      // Launch slug rename: the old public GP slug 301s to the new
      // search-intent slug. MUST ship at launch to preserve any pre-indexed
      // /gp-appointment links (brief §1.4).
      {
        source: `/:country/:lang${LANG}/gp-appointment`,
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      // Legacy → final
      {
        source: `/:country/:lang${LANG}/general-consultation`,
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: `/:country${HAS_SPECIALIST}/:lang${LANG}/specialist-consultation`,
        destination: "/:country/:lang/see-a-specialist",
        permanent: true,
      },
      // The `online-prescriptions` feature flag is OFF in every market (Ads
      // compliance — the public site is GP-only), so
      // `/repeat-prescription-request` 404s everywhere and any redirect aimed
      // at it is a 308→404 chain that keeps the old URL in Google's index as
      // an error instead of consolidating it. Point the aliases at the GP page
      // (200 in all six markets) until the flag is turned back on; the
      // canonical `/repeat-prescription-request` rewrite above is untouched, so
      // re-enabling the feature only means reverting these two destinations.
      {
        source: `/:country/:lang${LANG}/prescriptions`,
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: `/:country${HAS_TESTS}/:lang${LANG}/tests`,
        destination: "/:country/:lang/lab-tests",
        permanent: true,
      },
      // Interim → final (safety net)
      {
        source: `/:country/:lang${LANG}/online-doctor-visit`,
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: `/:country${HAS_SPECIALIST}/:lang${LANG}/specialist-appointment`,
        destination: "/:country/:lang/see-a-specialist",
        permanent: true,
      },
      {
        source: `/:country/:lang${LANG}/repeat-prescription`,
        // See the note above — flag off site-wide, so this would 308→404.
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      // Ireland internal-linking slug migration (per the internal-linking spec).
      // Old indexed/bookmarked slugs → new canonical slugs. Country/lang kept.
      // NOTE: `erectyle` and `respiractory` are spelled as in the live old URLs
      // (typos preserved on the FROM side on purpose).
      //
      // `:lang` is constrained to the real locale set. Unconstrained it matched
      // any two leading segments, so the Wix path /cs/portugal/medical-
      // consultation was read as country="cs", lang="portugal" and rewritten
      // into a second redirect — a 2-hop chain instead of one clean 308.
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/medical-consultation`,
        destination: "/:country/:lang/acute-medical-consultation",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/family-medicine-consultation`,
        destination: "/:country/:lang/chronic-disease-consultation",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/pain-management-consultation`,
        destination: "/:country/:lang/musculoskeletal-pain-assessment",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/erectyle-dysfunction-consultation`,
        destination: "/:country/:lang/mens-health-consultation",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/treatment-refill`,
        destination: "/:country/:lang/treatment-review",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/referral-consultation`,
        destination: "/:country/:lang/referral-and-investigations",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/self-referral`,
        destination: "/:country/:lang/referral-and-investigations",
        permanent: true,
      },
      {
        source: `/:country/:lang${LANG}/respiractory-infections`,
        // `/{country}/{lang}/respiratory-infections` is a rewrite onto
        // /services/respiratory-infections, and no market has that Service row
        // — the clean URL 404s, so pointing here was a 308→404. Same treatment
        // as the prescription aliases: send it to the GP page (200 everywhere)
        // and restore the direct mapping if the service is ever created.
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: `/:country${IE_ONLY}/:lang${LANG}/sick-leave`,
        destination: "/:country/:lang/sick-certificate-ireland",
        permanent: true,
      },
      // ── Legacy Wix URLs (pre-migration site) ─────────────────────────
      // Google still has these indexed; without redirects they soft-404
      // (HTTP 200 + "Page not found"), which is what users hit from old
      // search results. Inventory mirrors data/routes.ts.
      { source: "/home", destination: "/", permanent: true },
      { source: "/gift-card", destination: "/", permanent: true },
      { source: "/home-delivery", destination: "/", permanent: true },
      { source: "/partner-clinics", destination: "/", permanent: true },
      { source: "/category/:slug", destination: "/", permanent: true },
      { source: "/pricing-plans/list", destination: "/ireland/en/pricing", permanent: true },
      { source: "/online-prescription", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/home-health-test", destination: "/ireland/en/lab-tests", permanent: true },
      { source: "/home-health-tests/:slug", destination: "/ireland/en/lab-tests", permanent: true },
      { source: "/booking-calendar", destination: "/ireland/en/book", permanent: true },
      // Wix appended the service name as a path segment (…/consulta-de-urologia).
      // 195 live wix.to redirect links still point at these; Wix prefixed the
      // non-Irish services with a market code (ro-, pt-, cz-, sp-), so route
      // those to their own market's booking page instead of dumping every
      // market's inbound link on /ireland/en/book. MUST stay above the generic
      // /booking-calendar/:slug rule below — first match wins.
      { source: "/booking-calendar/:slug(ro-.*)", destination: "/romania/ro/book", permanent: true },
      { source: "/booking-calendar/:slug(pt-.*)", destination: "/portugal/pt/book", permanent: true },
      { source: "/booking-calendar/:slug(cz-.*)", destination: "/czechia/cs/book", permanent: true },
      { source: "/booking-calendar/:slug(sp-.*)", destination: "/spain/es/book", permanent: true },
      {
        source: "/:locale(cs|es|pt|ro)/booking-calendar/:slug(ro-.*)",
        destination: "/romania/ro/book",
        permanent: true,
      },
      {
        source: "/:locale(cs|es|pt|ro)/booking-calendar/:slug(pt-.*)",
        destination: "/portugal/pt/book",
        permanent: true,
      },
      {
        source: "/:locale(cs|es|pt|ro)/booking-calendar/:slug(cz-.*)",
        destination: "/czechia/cs/book",
        permanent: true,
      },
      {
        source: "/:locale(cs|es|pt|ro)/booking-calendar/:slug(sp-.*)",
        destination: "/spain/es/book",
        permanent: true,
      },
      // Unprefixed slugs are Wix's original Irish/Spanish/Czech service names
      // with no reliable market marker — they keep the Ireland fallback.
      { source: "/booking-calendar/:slug", destination: "/ireland/en/book", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/booking-calendar/:slug", destination: "/ireland/en/book", permanent: true },
      // Legacy country hubs
      { source: "/ireland-team", destination: "/ireland/en/doctors", permanent: true },
      { source: "/general-consultation-ie", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/specialty-ie", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/home-cz", destination: "/czechia/cs", permanent: true },
      { source: "/czechia-team", destination: "/czechia/cs/doctors", permanent: true },
      { source: "/general-consultation-cz", destination: "/czechia/cs/gp-consultation-online", permanent: true },
      // Czechia has `specialist-consultations` disabled, so
      // /czechia/cs/see-a-specialist 404s (every other market's does not).
      // Send these to the country hub rather than into a 404.
      { source: "/specialty-cz", destination: "/czechia/cs", permanent: true },
      { source: "/home-pt", destination: "/portugal/pt", permanent: true },
      { source: "/portugal-team", destination: "/portugal/pt/doctors", permanent: true },
      { source: "/general-consultation-pt", destination: "/portugal/pt/gp-consultation-online", permanent: true },
      { source: "/specialty-pt", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/home-sp", destination: "/spain/es", permanent: true },
      { source: "/spain-team", destination: "/spain/es/doctors", permanent: true },
      { source: "/general-consultation-sp", destination: "/spain/es/gp-consultation-online", permanent: true },
      { source: "/specialty-sp", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/home-rm", destination: "/romania/ro", permanent: true },
      { source: "/romania-team", destination: "/romania/ro/doctors", permanent: true },
      { source: "/general-consultation-rm", destination: "/romania/ro/gp-consultation-online", permanent: true },
      { source: "/specialty-rm", destination: "/romania/ro/see-a-specialist", permanent: true },
      { source: "/home-br", destination: "/brazil/pt", permanent: true },
      // ── Legacy doctor slugs that did NOT carry over 1:1 ────────────────
      //
      // These MUST stay above the `/:country-doctors/:slug` rules below (and
      // above their `/:locale/...` twins further down). Next matches in array
      // order, so a broad rule placed first would rewrite the slug unchanged
      // and land on a 404 — which is exactly what was happening.
      //
      // Verified 2026-08-08 against a 90-day GSC page export + the live public
      // roster API. Each target was re-checked live: HTTP 200, `index, follow`,
      // self-canonical, same market. Only same-person slug corrections are
      // here; a departed clinician is NOT redirected to a listing page (see
      // docs/audits/seo/legacy-redirect-recovery-2026-08-08.md for the ones
      // deliberately left 404ing pending a human decision).
      //
      // dr-miraim-faiz -> dr-mariam-faiz: transposed vowels in the Wix slug
      // for the same doctor, "Dr Mariam Faiz". 9 clicks / 227 impressions.
      { source: "/ireland-doctors/dr-miraim-faiz", destination: "/ireland/en/doctors/dr-mariam-faiz", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/dr-miraim-faiz", destination: "/ireland/en/doctors/dr-mariam-faiz", permanent: true },
      // silvia-alexandra-raminhos-fernandes -> silvia-alexandre-fernandes:
      // same clinician, "Silvia Alexandre Fernandes"; the shortened slug is
      // what the platform publishes. 0 clicks / 40 impressions.
      { source: "/ireland-doctors/silvia-alexandra-raminhos-fernandes", destination: "/ireland/en/doctors/silvia-alexandre-fernandes", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/silvia-alexandra-raminhos-fernandes", destination: "/ireland/en/doctors/silvia-alexandre-fernandes", permanent: true },
      // dr-vitor-pais -> dr-vitor-hugo-de-matos-pais: same clinician, "Dr Vitor
      // Hugo de Matos Pais" (OM registration 64505, Portugal General Practice) —
      // the Wix slug carried only first+last name, matching the same
      // truncation pattern as the Ireland corrections above. 41 clicks / 245
      // impressions over 90 days, 2026-08-08.
      { source: "/portugal-doctors/dr-vitor-pais", destination: "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal-doctors/dr-vitor-pais", destination: "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais", permanent: true },
      // ── Collapsed 2-hop chains (legacy-redirect-recovery-2026-08-08.md §9) ──
      //
      // Each of these already resolved correctly in 2 hops: the broad
      // `/{country}-doctors/:slug` rule below rewrote the slug unchanged onto
      // `/{country}/{lang}/doctors/{old-slug}`, which then itself 308'd via the
      // doctor page's own de-accented/alias-slug redirect (`doctorSlugCandidates`
      // in `lib/content/doctor-profile-data.ts`) onto the true live slug. Same
      // person, same market, both hops individually correct — just flattened to
      // one, per the "collapse rather than retain unnecessary chains" rule.
      { source: "/ireland-doctors/dr.-mohamed-fadzly-mustafar", destination: "/ireland/en/doctors/dr-mohamed-fadzly-bin-mohamed", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/dr.-mohamed-fadzly-mustafar", destination: "/ireland/en/doctors/dr-mohamed-fadzly-bin-mohamed", permanent: true },
      { source: "/ireland-doctors/dr-khoiamul-islam", destination: "/ireland/en/doctors/khoiamul-islam", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/dr-khoiamul-islam", destination: "/ireland/en/doctors/khoiamul-islam", permanent: true },
      { source: "/ireland-doctors/dr-maristela-ferro-nepomuceno", destination: "/ireland/en/doctors/maristela-ferro-nepomuceno", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/dr-maristela-ferro-nepomuceno", destination: "/ireland/en/doctors/maristela-ferro-nepomuceno", permanent: true },
      { source: "/czechia-doctors/mudr-ahmed-maklad", destination: "/czechia/cs/doctors/dr-ahmed-maklad", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/czechia-doctors/mudr-ahmed-maklad", destination: "/czechia/cs/doctors/dr-ahmed-maklad", permanent: true },
      { source: "/spain-doctors/javier-villarte-betancor", destination: "/spain/es/doctors/dr-javier-villarte-betancor", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain-doctors/javier-villarte-betancor", destination: "/spain/es/doctors/dr-javier-villarte-betancor", permanent: true },
      { source: "/spain-doctors/tomás-ruiz-palacios", destination: "/spain/es/doctors/dr-tomas-ruiz-palacios", permanent: true },

      // Legacy Wix doctor profiles — slugs carried over 1:1.
      //
      // `slugMatcherExcludingGone` makes this rule REFUSE to match a removed
      // clinician, so the request falls through to `proxy.ts`'s 410 instead.
      // Without that, this rule wins: Next evaluates `redirects()` BEFORE
      // middleware, so a departed doctor 308'd onto a URL that then answered
      // 410 — two hops, the first of which claims a live successor that does
      // not exist. Verified empirically 2026-08-08.
      {
        source: `/ireland-doctors/${slugMatcherExcludingGone("ireland-doctors")}`,
        destination: "/ireland/en/doctors/:slug",
        permanent: true,
      },
      // Same gone-slug exclusion as ireland-doctors below — mudr-jana-cyplinska
      // must fall through to the 410 in proxy.ts, not be 308'd onto a dead URL.
      {
        source: `/czechia-doctors/${slugMatcherExcludingGone("czechia-doctors")}`,
        destination: "/czechia/cs/doctors/:slug",
        permanent: true,
      },
      { source: "/pt/portugal-doctors/:slug", destination: "/portugal/pt/doctors/:slug", permanent: true },
      { source: "/spain-doctors/:slug", destination: "/spain/es/doctors/:slug", permanent: true },
      { source: "/romania-doctors/:slug", destination: "/romania/ro/doctors/:slug", permanent: true },
      // Legacy Wix top-level pages with no per-country equivalent on the new
      // platform — there is only one canonical /about page (app/(global)/about).
      { source: "/pt/about", destination: "/about", permanent: true },
      { source: "/portugal/medical-certificate-for-driving-license", destination: "/portugal/pt/services/certificado-medico-carta-de-conducao", permanent: true },
      // Brazil deliberately supports only en/es/pt (admin decision, not a
      // content gap) — CS/RO/DE are still valid site-wide locale codes
      // (resolveLocale() accepts any of the 6 global ones regardless of a
      // country's own supportedLocales), so a direct/old link to one of
      // these still resolves 200 unless redirected. Consolidate onto pt.
      { source: "/brazil/cs/:path*", destination: "/brazil/pt/:path*", permanent: true },
      { source: "/brazil/ro/:path*", destination: "/brazil/pt/:path*", permanent: true },
      { source: "/brazil/de/:path*", destination: "/brazil/pt/:path*", permanent: true },
      // Legacy specialist pages whose service still exists → new slug 1:1.
      { source: "/ireland-specialist-consultations/cardiology-consultation", destination: "/ireland/en/services/cardiology-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/neurology-consultation", destination: "/ireland/en/services/neurology-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/nutrition-consultation", destination: "/ireland/en/services/nutrition-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/pediatric-consultation", destination: "/ireland/en/services/paediatric-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/physiotherapy-consultation", destination: "/ireland/en/services/physiotherapy-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/psychiatry-consultation", destination: "/ireland/en/services/psychiatry-specialist-consultation", permanent: true },
      { source: "/ireland-specialist-consultations/psychology-consultation", destination: "/ireland/en/services/psychology-specialist-consultation", permanent: true },
      // Remaining legacy specialist slugs (service retired) → listing page.
      { source: "/ireland-specialist-consultations/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },
      // Legacy generic Wix service pages → specialist listing (best hub).
      { source: "/service-page/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },
      // Bare /ireland/<slug> pages that DO have an exact live equivalent. The
      // blanket rule below already returned 200 for all of them, but it dumped
      // every one on the GP page; these are the ones with real 90-day
      // impressions (sick-leave 291, self-referral 133, mental-health 53,
      // hypertension 12, migraine 7), so send them to the matching page.
      { source: "/ireland/sick-leave", destination: "/ireland/en/services/sick-certificate-ireland", permanent: true },
      { source: "/ireland/self-referral", destination: "/ireland/en/services/referral-and-investigations", permanent: true },
      { source: "/ireland/referral-consultation", destination: "/ireland/en/services/referral-and-investigations", permanent: true },
      { source: "/ireland/mental-health-assessment-consultation", destination: "/ireland/en/services/mental-health-consultation", permanent: true },
      { source: "/ireland/hypertension-consultation", destination: "/ireland/en/health/hypertension", permanent: true },
      { source: "/ireland/migraine-consultation", destination: "/ireland/en/health/migraine", permanent: true },
      { source: "/ireland/medical-consultation", destination: "/ireland/en/services/acute-medical-consultation", permanent: true },
      { source: "/ireland/weight-loss-consultation", destination: "/ireland/en/services/weight-management-consultation", permanent: true },
      { source: "/ireland/erectyle-dysfunction-consultation", destination: "/ireland/en/services/mens-health-consultation", permanent: true },
      // Legacy /ireland/<gp-slug> pages. The {3,} length guard keeps the
      // live 2-letter locale URLs (/ireland/en, /ireland/pt, …) untouched.
      { source: "/ireland/:slug([a-z0-9-]{3,})", destination: "/ireland/en/gp-consultation-online", permanent: true },

      // ── GSC top-500 404 sweep (2026-07-24) ────────────────────────────
      // 187 legacy Wix URLs still 404'd because the rules above only cover
      // the UNPREFIXED family names. Wix also served every page under a
      // /{locale}/ prefix (language switcher URLs) — same page, extra
      // segment. All countries support all 6 site locales (data/countries.ts
      // supportedLocales), so `/{locale}/{page}` is a legitimate, live
      // variant, not a typo. Rules below add the locale-prefixed forms; the
      // bare (unprefixed) rules above stay as-is.

      // -- locale-prefixed doctor listings: slug carried over 1:1 --------
      {
        source: `/:locale(cs|es|pt|ro)/czechia-doctors/${slugMatcherExcludingGone("czechia-doctors")}`,
        destination: "/czechia/cs/doctors/:slug",
        permanent: true,
      },
      // Same gone-slug exclusion as the bare rule above.
      {
        source: `/:locale(cs|es|pt|ro)/ireland-doctors/${slugMatcherExcludingGone("ireland-doctors")}`,
        destination: "/ireland/en/doctors/:slug",
        permanent: true,
      },
      { source: "/:locale(cs|es|pt|ro)/portugal-doctors/:slug", destination: "/portugal/pt/doctors/:slug", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain-doctors/:slug", destination: "/spain/es/doctors/:slug", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/romania-doctors/:slug", destination: "/romania/ro/doctors/:slug", permanent: true },
      // Bare (unprefixed) portugal-doctors — the other 4 country families
      // already have bare rules above; portugal-doctors was missing one.
      { source: "/portugal-doctors/:slug", destination: "/portugal/pt/doctors/:slug", permanent: true },

      // -- locale-prefixed team/hub pages ---------------------------------
      { source: "/:locale(cs|es|pt|ro)/ireland-team", destination: "/ireland/en/doctors", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal-team", destination: "/portugal/pt/doctors", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain-team", destination: "/spain/es/doctors", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/romania-team", destination: "/romania/ro/doctors", permanent: true },

      // -- locale-prefixed country homepages (/{locale}/home[-suffix]) ---
      // `:locale` is reused in the destination so one rule covers every
      // language-prefixed variant of a given country home.
      { source: "/:locale(cs|es|pt|ro)/home-pt", destination: "/portugal/:locale", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/home-sp", destination: "/spain/:locale", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/home-cz", destination: "/czechia/:locale", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/home-rm", destination: "/romania/:locale", permanent: true },
      // Brazil supports only en/es/pt, and /brazil/{cs,ro,de}/* is itself
      // 308'd onto /brazil/pt — so reusing `:locale` here chained 308→308 for
      // cs and ro. Split the rule and land those two on /brazil/pt directly.
      { source: "/:locale(es|pt)/home-br", destination: "/brazil/:locale", permanent: true },
      { source: "/:locale(cs|ro)/home-br", destination: "/brazil/pt", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/home", destination: "/ireland/:locale", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/home-delivery", destination: "/", permanent: true },
      // Bare Wix language-root (e.g. plain /cs with no page segment).
      { source: "/cs", destination: "/czechia/cs", permanent: true },

      // -- one-off top-level pages, bare + locale-prefixed ----------------
      { source: "/careers", destination: "/about", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/careers", destination: "/about", permanent: true },
      { source: "/legal-notices", destination: "/ireland/en/legal", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/legal-notices", destination: "/ireland/en/legal", permanent: true },
      { source: "/book-online", destination: "/ireland/en/book", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/book-online", destination: "/ireland/en/book", permanent: true },
      { source: "/plans-pricing", destination: "/ireland/en/pricing", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/plans-pricing", destination: "/ireland/en/pricing", permanent: true },
      { source: "/corporate-plans", destination: "/ireland/en/pricing", permanent: true },
      { source: "/return-and-refund-policy", destination: "/privacy", permanent: true },
      { source: "/copy-of-privacy-policy", destination: "/privacy", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/copy-of-privacy-policy", destination: "/privacy", permanent: true },

      // ── GSC 90-day legacy sweep (2026-07-28) ──────────────────────────
      // Every pre-migration URL Google still shows impressions for was
      // re-tested against production: 410 redirected cleanly, 61 died. 35 of
      // those were redirects aimed at pages the feature flags had since taken
      // offline (fixed above). These are the other 26 — legacy families that
      // never had a rule at all. Left alone they are 404s absorbing 1,552
      // impressions/90d, the single largest of them being /term-and-conditions
      // at 1,164.

      // Wix used the singular "term". 1,164 impressions, position 7.8 — by
      // some distance the most valuable dead URL on the site.
      { source: "/term-and-conditions", destination: "/terms", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/term-and-conditions", destination: "/terms", permanent: true },

      // Locale-prefixed forms of country hubs that only had bare rules.
      { source: "/:locale(cs|es|pt|ro)/specialty-ie", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/specialty-pt", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/specialty-sp", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/specialty-rm", destination: "/romania/ro/see-a-specialist", permanent: true },
      // Czechia has specialist-consultations disabled — hub, not a 404.
      { source: "/:locale(cs|es|pt|ro)/specialty-cz", destination: "/czechia/cs", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/general-consultation-ie", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/general-consultation-pt", destination: "/portugal/pt/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/general-consultation-sp", destination: "/spain/es/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/general-consultation-cz", destination: "/czechia/cs/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/general-consultation-rm", destination: "/romania/ro/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/czechia-team", destination: "/czechia/cs/doctors", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/online-prescription", destination: "/ireland/en/gp-consultation-online", permanent: true },

      // The bare form existed for every other market; Portugal's was missing,
      // as was the "-1" duplicate section Wix created.
      { source: "/portugal-specialist-consultations/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/portugal-specialist-consultations-1/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal-specialist-consultations-1/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },

      // Wix's `/{locale}/{country}/{service}` pages. Exact mappings first —
      // Next matches redirects in array order, so ANY precise rule for this
      // shape MUST sit above the `:slug` catch-alls that close the group.
      // (These exact rules used to live at the bottom of the file, below the
      // catch-alls, which made all six of them dead config: /es/portugal/
      // medical-certificate-for-driving-license landed on the Portugal
      // specialist hub instead of the certificate page it names.)
      {
        source: "/:locale(cs|es|pt|ro)/spain/aesthetic-medicine-online-consultation",
        destination: "/spain/es/services/consulta-online-medicina-estetica",
        permanent: true,
      },
      { source: "/:locale(cs|es|pt|ro)/spain/weight-loss-consultation", destination: "/spain/es/services/control-peso-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain/pain-management-consultation", destination: "/spain/es/services/musculoesqueletico-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain/vascular-circulatory-health-consultation", destination: "/spain/es/services/consulta-salud-vascular-circulatoria", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain/treatment-renewal", destination: "/spain/es/services/renovacion-tratamiento-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/medical-certificate-for-driving-license", destination: "/portugal/pt/services/certificado-medico-carta-de-conducao", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/weight-loss-consultation", destination: "/portugal/pt/services/perda-de-peso", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/family-and-general-medicine", destination: "/portugal/pt/services/medicina-geral-e-familiar", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/smoking-cessation-consultation", destination: "/portugal/pt/services/deixar-de-fumar", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/medical-consultation", destination: "/portugal/pt/services/consulta-medica", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/travelers-consultation", destination: "/portugal/pt/services/consulta-do-viajante", permanent: true },
      // The rest go to that country's specialist hub, which is the closest live
      // intent — a dead-end 404 helps nobody. Ireland is included so the
      // /{locale}/ireland/{slug} shape stops falling through to the
      // `/:country/:lang/{slug}` rules and chaining into a 404.
      { source: "/:locale(cs|es|pt|ro)/ireland/mental-health-assessment-consultation", destination: "/ireland/en/services/mental-health-consultation", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain/:slug", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/czechia/:slug", destination: "/czechia/cs", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/romania/:slug", destination: "/romania/ro/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland/:slug", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/brazil/:slug", destination: "/brazil/pt", permanent: true },

      // Remaining one-offs the sweep turned up.
      { source: "/:locale(cs|es|pt|ro)/blog", destination: "/blog", permanent: true },
      // (bare + locale-prefixed /booking-calendar/:slug are declared once,
      // higher up in the legacy Wix block — a second copy here was dead.)
      { source: "/:locale(cs|es|pt|ro)/home-health-tests/:slug", destination: "/ireland/en/lab-tests", permanent: true },
      // Top-level /services/<slug> only — the live pages are
      // /{country}/{lang}/services/<slug>, which this cannot match.
      { source: "/services/:slug", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/privacy", destination: "/privacy", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/about", destination: "/about", permanent: true },
      { source: "/frequent-asked-questions", destination: "/faq", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/gift-card", destination: "/", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/partner-clinics", destination: "/", permanent: true },
      { source: "/es/partnerclinics", destination: "/", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/category/:slug", destination: "/", permanent: true },
      { source: "/product-page/:slug", destination: "/", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/product-page/:slug", destination: "/", permanent: true },

      // -- Ireland partner-clinic / prescriptions / service-page ----------
      { source: "/ireland-partner-clinic/:slug", destination: "/ireland/en", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-partner-clinic/:slug", destination: "/ireland/en", permanent: true },
      { source: "/online-prescriptions/:slug", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/online-prescriptions/:slug", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/service-page/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },

      // -- specialist-consultation hubs (locale-prefixed + missing bares) -
      { source: "/:locale(cs|es|pt|ro)/ireland-specialist-consultations/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal-specialist-consultations/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/czechia-specialist-consultations/:slug", destination: "/czechia/cs", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/czechia-specialist-consultations/:slug", destination: "/czechia/cs", permanent: true },
      { source: "/spain-specialist-consultations/:slug", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/spain-specialist-consultations/:slug", destination: "/spain/es/see-a-specialist", permanent: true },

      // -- general-consultation-XX / specialty-XX: locale prefix ≠ suffix -
      // (the matching bare rules already exist above; these are the
      // mismatched-prefix variants actually indexed by Google)
      { source: "/pt/general-consultation-sp", destination: "/spain/es/gp-consultation-online", permanent: true },
      { source: "/cs/general-consultation-pt", destination: "/portugal/pt/gp-consultation-online", permanent: true },
      { source: "/cs/general-consultation-rm", destination: "/romania/ro/gp-consultation-online", permanent: true },
      { source: "/cs/general-consultation-sp", destination: "/spain/es/gp-consultation-online", permanent: true },
      { source: "/es/general-consultation-cz", destination: "/czechia/cs/gp-consultation-online", permanent: true },
      { source: "/es/general-consultation-rm", destination: "/romania/ro/gp-consultation-online", permanent: true },
      { source: "/es/general-consultation-sp", destination: "/spain/es/gp-consultation-online", permanent: true },
      { source: "/pt/specialty-pt", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/pt/specialty-ie", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/cs/specialty-pt", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/es/specialty-pt", destination: "/portugal/pt/see-a-specialist", permanent: true },

      // -- Portugal/Spain service pages: renamed slug lives at /services/*
      // (the locale-PREFIXED variants of these live in the
      // `/{locale}/{country}/{slug}` group above, where they have to sit to
      // beat the catch-alls. Everything here is the BARE `/{country}/{slug}`
      // Wix shape, which had no catch-all at all: 2,426 impressions/90d, of
      // which /portugal/medical-certificate-for-driving-license alone is 1,723.)
      { source: "/portugal/traveler's-consultation", destination: "/portugal/pt/services/consulta-do-viajante", permanent: true },
      { source: "/portugal/travelers-consultation", destination: "/portugal/pt/services/consulta-do-viajante", permanent: true },
      { source: "/portugal/weight-loss-consultation", destination: "/portugal/pt/services/perda-de-peso", permanent: true },
      { source: "/portugal/smoking-cessation-consultation", destination: "/portugal/pt/services/deixar-de-fumar", permanent: true },
      { source: "/portugal/medical-consultation", destination: "/portugal/pt/services/consulta-medica", permanent: true },
      { source: "/portugal/family-and-general-medicine", destination: "/portugal/pt/services/medicina-geral-e-familiar", permanent: true },
      { source: "/spain/vascular-circulatory-health-consultation", destination: "/spain/es/services/consulta-salud-vascular-circulatoria", permanent: true },
      { source: "/spain/pain-management-consultation", destination: "/spain/es/services/musculoesqueletico-online", permanent: true },
      { source: "/spain/weight-loss-consultation", destination: "/spain/es/services/control-peso-online", permanent: true },
      { source: "/spain/treatment-renewal", destination: "/spain/es/services/renovacion-tratamiento-online", permanent: true },
      { source: "/spain/aesthetic-medicine-online-consultation", destination: "/spain/es/services/consulta-online-medicina-estetica", permanent: true },
      // Bare `/{country}/{slug}` catch-alls for everything else in that shape
      // (/portugal/medical-exam, /portugal/diabetes-consultation, …). The {3,}
      // length guard keeps the live 2-letter locale roots (/portugal/pt, …)
      // untouched, exactly as the /ireland/:slug rule above does; `%` and `'`
      // are in the class so Wix's apostrophe slugs match in either spelling.
      { source: "/portugal/:slug([a-z0-9%'-]{3,})", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/spain/:slug([a-z0-9%'-]{3,})", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/czechia/:slug([a-z0-9%'-]{3,})", destination: "/czechia/cs", permanent: true },
      { source: "/romania/:slug([a-z0-9%'-]{3,})", destination: "/romania/ro/see-a-specialist", permanent: true },
      { source: "/brazil/:slug([a-z0-9%'-]{3,})", destination: "/brazil/pt", permanent: true },

      // Portugal has no live nutrition Service row, so neither the old English
      // slug nor the renamed PT one (`consulta-de-nutricao`, 7 impressions,
      // currently a hard 404) can point at /services/*. Hub instead — and both
      // sections need a rule, because /consult/* is itself a redirect stub.
      { source: `/portugal/:lang${LANG}/services/nutrition-consultation`, destination: "/portugal/:lang/see-a-specialist", permanent: true },
      { source: `/portugal/:lang${LANG}/consult/nutrition-consultation`, destination: "/portugal/:lang/see-a-specialist", permanent: true },
      { source: `/portugal/:lang${LANG}/services/consulta-de-nutricao`, destination: "/portugal/:lang/see-a-specialist", permanent: true },
      { source: `/portugal/:lang${LANG}/consult/consulta-de-nutricao`, destination: "/portugal/:lang/see-a-specialist", permanent: true },

      // -- Czech-language legacy paths (Wix "czech-republic" section) -----
      { source: "/czech-republic/:slug", destination: "/czechia/cs", permanent: true },

      // -- misc content families -------------------------------------------
      { source: "/home-health-tests-1/:slug", destination: "/ireland/en/lab-tests", permanent: true },
      // Per-article legacy blog redirects (SEO audit 2026-08-03, §2.5). Every
      // /post/:slug used to blanket-redirect to the hub even when the exact
      // article survived the migration — a soft-404 pattern that drops the
      // legacy URL's accumulated SERP equity. These MUST sit above the
      // `/post/:slug` catch-all below (rule order — first match wins), or the
      // catch-all shadows them silently. Only two slugs cleared the bar: an
      // exact slug match (diabetes) and an unambiguous single-candidate topic
      // match (hand-foot-and-mouth, old slug lacks the new "-signs-and-
      // treatment" suffix). Every other checked legacy /post/ slug — the 7
      // that still carry GSC impressions in the last 90 days, plus
      // getting-a-gp-sick-note-online-simplified from the technical audit
      // sample — had no confident current-article match and falls through to
      // the hub on purpose; see the redirect audit report for the full list.
      { source: "/post/diabetes-a-silent-disease", destination: "/ireland/en/blog/diabetes-a-silent-disease", permanent: true },
      { source: "/post/hand-foot-and-mouth-disease", destination: "/ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment", permanent: true },
      // 2026-08-04: two more exact slug matches the original pass missed —
      // both articles are PUBLISHED under these very slugs, so the catch-all
      // below was sending readers (and the sick-cert article's own in-body
      // "companion guide" link) to the hub instead of the article that exists.
      { source: "/post/when-to-see-a-gp-online-vs-in-person", destination: "/ireland/en/blog/when-to-see-a-gp-online-vs-in-person", permanent: true },
      { source: "/post/sick-certificate-ireland-employee-rights", destination: "/ireland/en/blog/sick-certificate-ireland-employee-rights", permanent: true },
      { source: "/post/:slug", destination: "/ireland/en/blog", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/post/:slug", destination: "/ireland/en/blog", permanent: true },
      { source: "/blog/categories/:slug", destination: "/ireland/en/blog", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
