import path from "node:path";
import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  ...(remotePatterns ? { images: { remotePatterns } } : {}),
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/admin/doctors/new",
          destination: "/admin/doctors/create",
        },
      ],
    };
  },
};

export default nextConfig;
