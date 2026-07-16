import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

/**
 * Load `backend/.env` before reading `DATABASE_URL`.
 * Works when CLI cwd is repo root, `backend/`, or via `pnpm --filter backend`
 * because paths are resolved from this config file, not `process.cwd()`.
 */
const backendRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(backendRoot, ".env") });

// `prisma/config`'s env() throws PrismaConfigEnvError the instant this file
// loads if DATABASE_URL is unset — which breaks `prisma generate` (a
// schema-only, no-DB-connection operation run via postinstall) in any CI job
// that doesn't provision a database. Read process.env directly with a dummy
// fallback so generate keeps working; real commands (migrate, studio, db
// push) still get the actual value whenever it's configured.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
