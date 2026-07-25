import { config as loadEnv } from "dotenv";
import { join } from "node:path";

/**
 * Hard gate loaded via `node --import` BEFORE any `*.test.ts` file runs.
 * Root-caused the 2026-07-05 incident: `npm test` ran node:test against
 * `.env`'s DATABASE_URL, which pointed at the LIVE Railway instance
 * (trolley.proxy.rlwy.net). A test's cleanup path called a scoped
 * `prisma.service.deleteMany({ where: { id: ... } })`, but Prisma treats an
 * `undefined` filter value as "field omitted" rather than "match nothing" —
 * so if a fixture id was ever undefined (a partially-failed setup, a race,
 * any future refactor), that call silently becomes `deleteMany({})` and
 * wipes the whole table. Every current test's cleanup happens to be
 * correctly scoped, but that's exactly the kind of invariant a single
 * future edit can quietly break. The only ROBUST guard is: tests must
 * never be able to reach a live database at all, full stop.
 *
 * Safe hosts: localhost / 127.0.0.1 / the docker-compose `postgres`
 * service name, OR a database name containing "test"/"shadow". Anything
 * else refuses to run, loudly, before a single test file's top-level code
 * (which is where fixtures start creating/deleting rows) executes.
 *
 * Escape hatch for a genuinely isolated CI test database that doesn't fit
 * the naming convention: set `ALLOW_LIVE_DB_TESTS=1` explicitly.
 */
// `.env.test` FIRST — dotenv never overwrites an already-set variable, so
// whatever loads first wins. It carries the committed test-only RS256 keypair
// (S-012 made the keys mandatory at boot) and the docker-compose test database.
// Without it, CI has no `.env` at all and every suite died in its before-hook
// with "AUTH_JWT_PRIVATE_KEY is required", while locally `.env`'s live Railway
// DATABASE_URL loaded first and the guard below refused to run at all.
// A real environment variable still beats both files, so CI's own DATABASE_URL
// (its Postgres service) keeps winning over the file's.
loadEnv({ path: join(__dirname, "..", ".env.test") });
loadEnv({ path: join(__dirname, "..", ".env") });

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "postgres"]);

function isSafeDatabaseUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (SAFE_HOSTS.has(url.hostname)) return true;
  const dbName = url.pathname.replace(/^\//, "").toLowerCase();
  return dbName.includes("test") || dbName.includes("shadow");
}

/** Best-effort hostname for the error message only — must never throw on a
 *  malformed DATABASE_URL, or it'd mask the friendly refusal message below. */
function safeHostname(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return "(unparseable)";
  }
}

if (process.env.ALLOW_LIVE_DB_TESTS !== "1") {
  const raw = process.env.DATABASE_URL;
  if (!raw || !isSafeDatabaseUrl(raw)) {
    const hint = raw ? safeHostname(raw) : "(unset)";
    console.error(
      `\n🛑 REFUSING TO RUN TESTS\n` +
        `DATABASE_URL host "${hint}" is not a recognized local/test database.\n` +
        `Tests run destructive Prisma calls (deleteMany, etc.) and Prisma treats an\n` +
        `undefined filter value as "no filter" — a single bad fixture id can wipe a\n` +
        `whole table. This exact bug wiped the live Service table on 2026-07-05.\n\n` +
        `Fix: point DATABASE_URL at a local/docker Postgres (see docker-compose.yml),\n` +
        `or a database whose name contains "test"/"shadow".\n` +
        `Intentional exception: set ALLOW_LIVE_DB_TESTS=1.\n`,
    );
    process.exit(1);
  }
}
