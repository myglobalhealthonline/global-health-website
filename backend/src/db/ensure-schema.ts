import { Pool } from "pg";

/**
 * Lightweight, idempotent schema patches that run once at boot.
 *
 * The project doesn't have a clean prisma migrate history in production
 * (drift from past `prisma db push` runs), so adding a new migration file
 * and relying on `prisma migrate deploy` is risky — it could refuse to
 * run if it can't reconcile the `_prisma_migrations` table. Instead, we
 * apply additive, idempotent DDL here on every server start.
 *
 * Rules for adding to this file:
 *   - Every statement MUST be idempotent (`IF NOT EXISTS` or equivalent).
 *   - Additive only — never drop or rename columns from this hook.
 *   - Keep the list short; long DDL on every boot slows cold starts.
 *
 * Once we sort out the migration history properly, statements here can
 * move into proper migrations and this file can be retired.
 */
const PATCHES: { name: string; sql: string }[] = [
  {
    name: "Country.enabledFeatures",
    sql: `
      ALTER TABLE "Country"
        ADD COLUMN IF NOT EXISTS "enabledFeatures" TEXT[] NOT NULL DEFAULT ARRAY[
          'country-home',
          'country-content',
          'pages',
          'services',
          'general-consultations',
          'specialist-consultations',
          'online-prescriptions',
          'health-tests',
          'appointments'
        ]::TEXT[];
    `,
  },
  {
    name: "Service.galleryImagePaths",
    sql: `
      ALTER TABLE "Service"
        ADD COLUMN IF NOT EXISTS "galleryImagePaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    `,
  },
];

export async function ensureSchema(log: {
  info: (msg: string) => void;
  error: (msg: string) => void;
}): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log.info("[ensure-schema] DATABASE_URL not set — skipping idempotent patches");
    return;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  try {
    for (const patch of PATCHES) {
      try {
        await pool.query(patch.sql);
        log.info(`[ensure-schema] applied/skipped: ${patch.name}`);
      } catch (error) {
        // Log the failure but don't crash the server — the offending
        // query path can fail loudly later, and at least the rest of
        // the app comes up.
        log.error(
          `[ensure-schema] failed: ${patch.name} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  } finally {
    await pool.end();
  }
}
