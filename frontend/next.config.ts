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
      ],
    };
  },
};

export default withBundleAnalyzer(nextConfig);
