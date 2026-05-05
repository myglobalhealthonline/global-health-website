import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

/**
 * Load `backend/.env` before Prisma reads `env("DATABASE_URL")`.
 * Works when CLI cwd is repo root, `backend/`, or via `pnpm --filter backend`
 * because paths are resolved from this config file, not `process.cwd()`.
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
