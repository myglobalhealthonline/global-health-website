import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Keep this alias for the future admin doctor edit route.
        {
          source: "/admin/doctors/new",
          destination: "/admin/doctors/create",
        },
      ],
    };
  },
};

export default nextConfig;
