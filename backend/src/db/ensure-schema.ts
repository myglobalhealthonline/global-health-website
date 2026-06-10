import { Pool } from "pg";

/**
 * C8 fix: all schema patches promoted to proper Prisma migrations.
 * PATCHES is intentionally empty — this function is now a no-op.
 * Run `prisma migrate deploy` to apply schema changes; never add entries
 * here again. Retire this file in the next cleanup sprint.
 */
const PATCHES: { name: string; sql: string }[] = [
  // All patches live in backend/prisma/migrations/. Add new changes there.
];

export async function ensureSchema(log: {
  info: (msg: string) => void;
  error: (msg: string) => void;
}): Promise<void> {
  if (PATCHES.length === 0) {
    log.info("[ensure-schema] no patches — skipped");
    return;
  }
  if (!process.env.DATABASE_URL) {
    log.info("[ensure-schema] DATABASE_URL not set — skipping idempotent patches");
    return;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_EnsureSchemaPatches" (
        "name"      TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const applied = new Set<string>();
    try {
      const res = await pool.query<{ name: string }>(
        `SELECT "name" FROM "_EnsureSchemaPatches"`,
      );
      for (const row of res.rows) applied.add(row.name);
    } catch (err) {
      log.error(
        `[ensure-schema] could not read patch ledger — running all patches anyway — ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    let ran = 0;
    let skipped = 0;
    for (const patch of PATCHES) {
      if (applied.has(patch.name)) {
        skipped += 1;
        continue;
      }
      try {
        await pool.query(patch.sql);
        await pool.query(
          `INSERT INTO "_EnsureSchemaPatches" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`,
          [patch.name],
        );
        log.info(`[ensure-schema] applied: ${patch.name}`);
        ran += 1;
      } catch (error) {
        log.error(
          `[ensure-schema] failed: ${patch.name} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    log.info(`[ensure-schema] done — applied=${ran} skipped=${skipped}`);
  } finally {
    await pool.end();
  }
}
