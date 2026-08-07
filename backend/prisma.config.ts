import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";
// @ts-expect-error - plain .mjs so it stays runnable from npm scripts with no
// TypeScript loader; there is no type declaration and it needs none.
import { assertSafeDatabaseTarget } from "./scripts/guard-db-target.mjs";

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

// Every Prisma CLI path loads this file, so it is the one place a guard cannot
// be walked around by reaching for `npx` instead of an npm script. Throws for
// mutating commands aimed at a database that is not allowlisted; read-only and
// schema-only commands (notably `generate`, which runs on postinstall with no
// database at all) pass straight through. See scripts/guard-db-target.mjs.
assertSafeDatabaseTarget(process.env.DATABASE_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
