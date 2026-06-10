import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Global Health Number generator.
 *
 * Format: GH-YYYY-NNNNNN  (e.g. GH-2026-000001)
 *
 * Atomicity guarantee: uses a per-year counter table with SELECT … FOR UPDATE
 * so parallel registrations can never collide. The counter table is created
 * idempotently in ensure-schema.ts before the server accepts traffic.
 *
 * Never call this on the frontend. The returned number is permanent and must
 * be written to PatientProfile.globalHealthNumber in the same transaction.
 */

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
}

export async function generateGlobalHealthNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Upsert the counter row for this year and claim the next sequence value.
    await client.query(
      `INSERT INTO "ghn_counter" (year, last_seq)
       VALUES ($1, 0)
       ON CONFLICT (year) DO NOTHING`,
      [year],
    );

    const result = await client.query<{ last_seq: string }>(
      `UPDATE "ghn_counter"
       SET last_seq = last_seq + 1
       WHERE year = $1
       RETURNING last_seq`,
      [year],
    );

    await client.query("COMMIT");

    const seq = Number(result.rows[0].last_seq);
    const padded = seq.toString().padStart(6, "0");
    return `GH-${year}-${padded}`;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
