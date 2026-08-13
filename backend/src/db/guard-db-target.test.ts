import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error - plain .mjs, no type declaration and it needs none.
import { assertSafeDatabaseTarget } from "../../scripts/guard-db-target.mjs";

/**
 * The guard that stands between a bare `npx prisma migrate deploy` and the
 * production database (`scripts/guard-db-target.mjs`).
 *
 * `hasEnvFile` is injected rather than read from disk so these run identically
 * on a workstation (where `backend/.env` exists and holds the PRODUCTION url)
 * and in CI (where it does not).
 */

const PROD = "postgresql://u:p@trolley.proxy.rlwy.net:31877/railway";
const DEV = "postgresql://u:p@hayabusa.proxy.rlwy.net:49401/railway";
const LOCAL = "postgresql://u:p@localhost:5433/global_health_test";
const argv = (...words: string[]) => ["node", "prisma", ...words];

const call = (url: string, words: string[], hasEnvFile: boolean) =>
  assertSafeDatabaseTarget(url, argv(...words), { hasEnvFile });

test("refuses a mutating command against an un-allowlisted host", () => {
  assert.throws(() => call(PROD, ["migrate", "deploy"], true), /Refusing to run/);
  assert.throws(() => call(DEV, ["db", "push"], true), /Refusing to run/);
  assert.throws(() => call(PROD, ["studio"], true), /Refusing to run/);
});

test("lets read-only and schema-only commands through", () => {
  // `generate` runs on postinstall in CI with no database at all.
  assert.doesNotThrow(() => call(PROD, ["generate"], true));
  assert.doesNotThrow(() => call(PROD, ["migrate", "diff"], true));
  assert.doesNotThrow(() => call(PROD, ["migrate", "status"], true));
});

test("local databases are always allowed", () => {
  assert.doesNotThrow(() => call(LOCAL, ["migrate", "deploy"], true));
});

test("DB_GUARD_ALLOW_HOST only allows the host it names", () => {
  process.env.DB_GUARD_ALLOW_HOST = "hayabusa.proxy.rlwy.net";
  try {
    assert.doesNotThrow(() => call(DEV, ["migrate", "deploy"], true));
    assert.throws(() => call(PROD, ["migrate", "deploy"], true), /Refusing to run/);
  } finally {
    delete process.env.DB_GUARD_ALLOW_HOST;
  }
});

test("steps aside where there is no backend/.env to fall into", () => {
  // A deploy container or a CI job: DATABASE_URL was supplied deliberately, so
  // there is no unnamed target to protect. Railway's pre-deploy
  // `prisma migrate deploy` runs here, and refusing it crash-loops the service.
  assert.doesNotThrow(() => call(DEV, ["migrate", "deploy"], false));
  assert.doesNotThrow(() => call(PROD, ["migrate", "deploy"], false));
});
