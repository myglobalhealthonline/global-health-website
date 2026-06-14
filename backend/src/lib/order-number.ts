import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Sequential order number generator.
 *
 * Format: ORD-NNNNNN (e.g. ORD-000001)
 *
 * Uses atomic UPDATE … RETURNING on order_counter so parallel checkouts
 * never collide. Never call from the frontend.
 */

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
}

export async function generateOrderNumber(): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "order_counter" (id, last_seq)
       VALUES (1, 0)
       ON CONFLICT (id) DO NOTHING`,
    );

    const result = await client.query<{ last_seq: string }>(
      `UPDATE "order_counter"
       SET last_seq = last_seq + 1
       WHERE id = 1
       RETURNING last_seq`,
    );

    await client.query("COMMIT");

    const seq = Number(result.rows[0].last_seq);
    return `ORD-${seq.toString().padStart(6, "0")}`;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
