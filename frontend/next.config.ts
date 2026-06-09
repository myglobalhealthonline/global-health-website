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

function mediaRemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> | undefined {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/api/media/**",
      },
    ];
  } catch {
    return undefined;
  }
}

const remotePatterns = mediaRemotePatterns();
const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  ...(remotePatterns ? { images: { remotePatterns } } : {}),
  async rewrites() {
    const dynamicRewrites = apiOrigin
      ? [
          {
            source: "/api/media/:path*",
            destination: `${apiOrigin}/api/media/:path*`,
          },
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
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
