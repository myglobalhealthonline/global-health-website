/**
 * Refuse to point a schema- or data-mutating Prisma command at a database that
 * is not on an explicit allowlist.
 *
 * Why this exists: `backend/.env` holds the PRODUCTION `DATABASE_URL`, and
 * `backend/prisma.config.ts` loads that file for every Prisma CLI invocation.
 * So a bare `npx prisma migrate deploy` run from `backend/` — with no
 * `--env-file`, nothing named "prod" anywhere on the command line, and no
 * prompt — is a production write. On 2026-08-07 exactly that applied nine
 * unreleased migrations to production, including a data UPDATE.
 *
 * The guard is called from `prisma.config.ts` rather than an npm `pre*` hook
 * because npm hooks only fire for named scripts: `pnpm db:deploy` would be
 * covered and `npx prisma migrate deploy` — the thing that actually happened —
 * would not. The config file is the one place every Prisma CLI path goes
 * through.
 *
 * Read-only and schema-only commands are untouched: `generate` runs on
 * postinstall in CI with no database at all, and blocking it would break every
 * install.
 *
 * To target a database that is not allowlisted, name it deliberately:
 *
 *     DB_GUARD_ALLOW_HOST=trolley.proxy.rlwy.net npx prisma migrate deploy
 *
 * The value must equal the host the command would actually reach, so it cannot
 * be satisfied by a habitual `=1` and cannot be left exported in a shell
 * profile without pinning one specific database.
 *
 * The guard is scoped to machines that HAVE `backend/.env`. Where that file is
 * absent — a deploy container, CI — the URL was supplied deliberately and there
 * is nothing to fall into, so the guard steps aside rather than crash-looping
 * a service whose pre-deploy step is `prisma migrate deploy`.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** `backend/.env` — the file that makes an unnamed target possible at all. */
const ENV_FILE = join(dirname(dirname(fileURLToPath(import.meta.url))), ".env");

/** Local databases are always fine — they are nobody's production. */
const DEFAULT_ALLOWED = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres-test"]);

/**
 * Commands that change a database, or hand someone a UI that can. `db execute`
 * runs arbitrary SQL and `studio` edits rows, so both belong here even though
 * neither is a migration. `migrate diff` is absent deliberately: it only reads.
 */
const MUTATING = [
  ["migrate", "deploy"],
  ["migrate", "dev"],
  ["migrate", "reset"],
  ["migrate", "resolve"],
  ["db", "push"],
  ["db", "execute"],
  ["db", "seed"],
  ["studio"],
];

function commandFromArgv(argv) {
  // `argv` is the whole Prisma CLI invocation; flags can be interleaved, so
  // match on the ordered non-flag words rather than fixed positions.
  const words = argv.slice(2).filter((a) => !a.startsWith("-"));
  return MUTATING.find((cmd) => cmd.every((word, i) => words[i] === word)) ?? null;
}

function hostOf(url) {
  try {
    // A Postgres URL is URL-parseable; a malformed one has no host we could
    // check, and an unknown target is exactly what this guard exists to stop.
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * @param {string | undefined} databaseUrl the URL the CLI is about to use
 * @param {string[]} argv `process.argv` of the Prisma CLI process
 * @param {{ hasEnvFile?: boolean }} [opts] `hasEnvFile` is injectable for tests
 *   only; production always reads the real `backend/.env`.
 * @throws when the command mutates and the target is not allowlisted
 */
export function assertSafeDatabaseTarget(databaseUrl, argv = process.argv, opts = {}) {
  const command = commandFromArgv(argv);
  if (!command) return;

  const hasEnvFile = opts.hasEnvFile ?? existsSync(ENV_FILE);

  // No `backend/.env` on disk means there is no ambient production URL for a
  // bare command to fall into: DATABASE_URL is whatever the operator or the
  // platform deliberately supplied, which is the "name it deliberately" bar
  // this guard exists to enforce. That is a deploy container (Railway injects
  // DATABASE_URL per environment and ships no .env) or a CI job.
  //
  // Without this, Railway's pre-deploy `prisma migrate deploy` is refused and
  // the service crash-loops — which is exactly what happened to the dev
  // backend on 2026-08-07, five deploys in a row, until someone pinned
  // DB_GUARD_ALLOW_HOST on the service. That pin is the habitual bypass this
  // file's own docstring warns against, and it re-breaks the day the database
  // host changes.
  if (!hasEnvFile) return;

  const host = hostOf(databaseUrl ?? "");
  // No URL at all means no connection will be made (or Prisma will fail on its
  // own terms with a better message than this guard could give).
  if (!databaseUrl || !host) return;

  const extra = (process.env.DB_GUARD_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (DEFAULT_ALLOWED.has(host) || extra.includes(host)) return;

  if (process.env.DB_GUARD_ALLOW_HOST === host) {
    console.warn(
      `[db-guard] "prisma ${command.join(" ")}" against ${host} — allowed by DB_GUARD_ALLOW_HOST.`,
    );
    return;
  }

  throw new Error(
    [
      "",
      `  Refusing to run "prisma ${command.join(" ")}" against ${host}.`,
      "",
      "  backend/.env holds the PRODUCTION DATABASE_URL and prisma.config.ts",
      "  loads it for every Prisma command, so this would have written to a",
      "  live database with nothing on the command line saying so.",
      "",
      "  If you meant the dev database:",
      "      node --env-file=.env.dev node_modules/prisma/build/index.js migrate deploy",
      "",
      `  If you really meant ${host}, name it:`,
      `      DB_GUARD_ALLOW_HOST=${host} <your command>`,
      "",
    ].join("\n"),
  );
}

// Runnable directly, so npm `pre*` hooks can fail a named script before Prisma
// starts: `node scripts/guard-db-target.mjs migrate deploy`. The config-file
// call above is the real guard — this one only makes `pnpm db:deploy` fail with
// the same message a moment earlier.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Same load order as prisma.config.ts, so the guard reads the same URL the
  // CLI would. dotenv never overrides an already-set variable, so an explicit
  // `--env-file` or exported DATABASE_URL still wins here exactly as it does there.
  loadEnv({ path: join(dirname(dirname(fileURLToPath(import.meta.url))), ".env") });
  try {
    assertSafeDatabaseTarget(process.env.DATABASE_URL);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
