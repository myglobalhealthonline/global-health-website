import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Load `backend/.env` before Prisma reads `env("DATABASE_URL")`.
 * Resolves paths from this config file, so it works from repo root,
 * `backend/`, or via `pnpm --filter backend`.
 */
const backendRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(backendRoot, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
