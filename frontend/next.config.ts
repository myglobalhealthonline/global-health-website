import path from "node:path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

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
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
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
      // `/checkout*`, `/legal*` (unverified / auth-adjacent) — those keep the
      // default no-store behavior.
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
        source: "/:country/:lang/(lab-tests|doctors|blog|services)/:slug",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
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
        "nutrition-consultation": "consulta-de-nutricao",
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
    const localizedSlugRedirects = Object.entries(localizedSlugRenames).flatMap(
      ([countrySlug, map]) =>
        Object.entries(map).flatMap(([oldSlug, newSlug]) =>
          ["services", "consult"].map((section) => ({
            source: `/${countrySlug}/:lang/${section}/${oldSlug}`,
            destination: `/${countrySlug}/:lang/${section}/${newSlug}`,
            permanent: true,
          })),
        ),
    );
    return [
      ...localizedSlugRedirects,
      // No services index page exists — only /services/:slug. Send the bare
      // section URL to the country home instead of a 404.
      {
        source: "/:country/:lang/services",
        destination: "/:country/:lang",
        permanent: true,
      },
      {
        source: "/:country/:lang/book-online",
        destination: "/:country/:lang/book",
        permanent: true,
      },
      // Launch slug rename: the old public GP slug 301s to the new
      // search-intent slug. MUST ship at launch to preserve any pre-indexed
      // /gp-appointment links (brief §1.4).
      {
        source: "/:country/:lang/gp-appointment",
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      // Legacy → final
      {
        source: "/:country/:lang/general-consultation",
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: "/:country/:lang/specialist-consultation",
        destination: "/:country/:lang/see-a-specialist",
        permanent: true,
      },
      {
        source: "/:country/:lang/prescriptions",
        destination: "/:country/:lang/repeat-prescription-request",
        permanent: true,
      },
      {
        source: "/:country/:lang/tests",
        destination: "/:country/:lang/lab-tests",
        permanent: true,
      },
      // Interim → final (safety net)
      {
        source: "/:country/:lang/online-doctor-visit",
        destination: "/:country/:lang/gp-consultation-online",
        permanent: true,
      },
      {
        source: "/:country/:lang/specialist-appointment",
        destination: "/:country/:lang/see-a-specialist",
        permanent: true,
      },
      {
        source: "/:country/:lang/repeat-prescription",
        destination: "/:country/:lang/repeat-prescription-request",
        permanent: true,
      },
      // Ireland internal-linking slug migration (per the internal-linking spec).
      // Old indexed/bookmarked slugs → new canonical slugs. Country/lang kept.
      // NOTE: `erectyle` and `respiractory` are spelled as in the live old URLs
      // (typos preserved on the FROM side on purpose).
      {
        source: "/:country/:lang/medical-consultation",
        destination: "/:country/:lang/acute-medical-consultation",
        permanent: true,
      },
      {
        source: "/:country/:lang/family-medicine-consultation",
        destination: "/:country/:lang/chronic-disease-consultation",
        permanent: true,
      },
      {
        source: "/:country/:lang/pain-management-consultation",
        destination: "/:country/:lang/musculoskeletal-pain-assessment",
        permanent: true,
      },
      {
        source: "/:country/:lang/erectyle-dysfunction-consultation",
        destination: "/:country/:lang/mens-health-consultation",
        permanent: true,
      },
      {
        source: "/:country/:lang/treatment-refill",
        destination: "/:country/:lang/treatment-review",
        permanent: true,
      },
      {
        source: "/:country/:lang/referral-consultation",
        destination: "/:country/:lang/referral-and-investigations",
        permanent: true,
      },
      {
        source: "/:country/:lang/self-referral",
        destination: "/:country/:lang/referral-and-investigations",
        permanent: true,
      },
      {
        source: "/:country/:lang/respiractory-infections",
        destination: "/:country/:lang/respiratory-infections",
        permanent: true,
      },
      {
        source: "/:country/:lang/sick-leave",
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
      { source: "/online-prescription", destination: "/ireland/en/repeat-prescription-request", permanent: true },
      { source: "/home-health-test", destination: "/ireland/en/lab-tests", permanent: true },
      { source: "/home-health-tests/:slug", destination: "/ireland/en/lab-tests", permanent: true },
      { source: "/booking-calendar", destination: "/ireland/en/book", permanent: true },
      // Legacy country hubs
      { source: "/ireland-team", destination: "/ireland/en/doctors", permanent: true },
      { source: "/general-consultation-ie", destination: "/ireland/en/gp-consultation-online", permanent: true },
      { source: "/specialty-ie", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/home-cz", destination: "/czechia/cs", permanent: true },
      { source: "/czechia-team", destination: "/czechia/cs/doctors", permanent: true },
      { source: "/general-consultation-cz", destination: "/czechia/cs/gp-consultation-online", permanent: true },
      { source: "/specialty-cz", destination: "/czechia/cs/see-a-specialist", permanent: true },
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
      // Legacy Wix doctor profiles — slugs carried over 1:1.
      { source: "/ireland-doctors/:slug", destination: "/ireland/en/doctors/:slug", permanent: true },
      { source: "/czechia-doctors/:slug", destination: "/czechia/cs/doctors/:slug", permanent: true },
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
      { source: "/:locale(cs|es|pt|ro)/czechia-doctors/:slug", destination: "/czechia/cs/doctors/:slug", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/ireland-doctors/:slug", destination: "/ireland/en/doctors/:slug", permanent: true },
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
      { source: "/:locale(cs|es|pt|ro)/home-br", destination: "/brazil/:locale", permanent: true },
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
      { source: "/online-prescriptions/:slug", destination: "/ireland/en/repeat-prescription-request", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/online-prescriptions/:slug", destination: "/ireland/en/repeat-prescription-request", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/service-page/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },

      // -- specialist-consultation hubs (locale-prefixed + missing bares) -
      { source: "/:locale(cs|es|pt|ro)/ireland-specialist-consultations/:slug", destination: "/ireland/en/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/portugal-specialist-consultations/:slug", destination: "/portugal/pt/see-a-specialist", permanent: true },
      { source: "/czechia-specialist-consultations/:slug", destination: "/czechia/cs/see-a-specialist", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/czechia-specialist-consultations/:slug", destination: "/czechia/cs/see-a-specialist", permanent: true },
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

      // -- Portugal service pages: renamed slug already lives at /services/*
      { source: "/portugal/traveler's-consultation", destination: "/portugal/pt/services/consulta-do-viajante", permanent: true },
      { source: "/es/portugal/medical-certificate-for-driving-license", destination: "/portugal/pt/services/certificado-medico-carta-de-conducao", permanent: true },
      { source: "/cs/portugal/medical-certificate-for-driving-license", destination: "/portugal/pt/services/certificado-medico-carta-de-conducao", permanent: true },
      { source: "/pt/portugal/weight-loss-consultation", destination: "/portugal/pt/services/perda-de-peso", permanent: true },
      { source: "/es/portugal/weight-loss-consultation", destination: "/portugal/pt/services/perda-de-peso", permanent: true },
      { source: "/cs/portugal/family-and-general-medicine", destination: "/portugal/pt/services/medicina-geral-e-familiar", permanent: true },
      { source: "/cs/portugal/smoking-cessation-consultation", destination: "/portugal/pt/services/deixar-de-fumar", permanent: true },
      // No renamed-slug match for "medical-exam" — nearest real page is the hub.
      { source: "/cs/portugal/medical-exam", destination: "/portugal/pt/see-a-specialist", permanent: true },

      // -- one-off country service pages with no exact new-scheme match ---
      { source: "/spain/treatment-renewal", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/cs/spain/aesthetic-medicine-online-consultation", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/es/spain/diabetes-consultation", destination: "/spain/es/see-a-specialist", permanent: true },
      { source: "/es/ireland/mental-health-assessment-consultation", destination: "/ireland/en/see-a-specialist", permanent: true },

      // -- Czech-language legacy paths (Wix "czech-republic" section) -----
      { source: "/czech-republic/:slug", destination: "/czechia/cs/see-a-specialist", permanent: true },

      // -- misc content families -------------------------------------------
      { source: "/home-health-tests-1/:slug", destination: "/ireland/en/lab-tests", permanent: true },
      { source: "/post/:slug", destination: "/ireland/en/blog", permanent: true },
      { source: "/:locale(cs|es|pt|ro)/post/:slug", destination: "/ireland/en/blog", permanent: true },
      { source: "/blog/categories/:slug", destination: "/ireland/en/blog", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
