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
  if (raw) {
    try {
      const url = new URL(raw);
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
  return patterns;
}

const remotePatterns = mediaRemotePatterns();
const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

// Baseline security headers applied to every response. The
// Content-Security-Policy is intentionally NOT set here — it is emitted
// per-request by the edge proxy (`proxy.ts`) so it can carry a nonce-based
// script-src on the dynamically-rendered authenticated portals while keeping
// the baseline (no-script-src) policy on the statically-generated public site.
// Setting a CSP here too would emit a duplicate header. We ship the remaining
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

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
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
        //   GENERAL       → /gp-appointment
        //   SPECIALIST    → /see-a-specialist
        //   PRESCRIPTION  → /repeat-prescription-request
        //   HEALTH_TEST   → /lab-tests
        {
          source: "/:country/:lang/gp-appointment",
          destination: "/:country/:lang/general-consultation",
        },
        {
          source: "/:country/:lang/gp-appointment/:slug",
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
    return [
      {
        source: "/:country/:lang/book-online",
        destination: "/:country/:lang/book",
        permanent: true,
      },
      // Legacy → final
      {
        source: "/:country/:lang/general-consultation",
        destination: "/:country/:lang/gp-appointment",
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
        destination: "/:country/:lang/gp-appointment",
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
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
