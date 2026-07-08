import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Sequential invoice number generator, one counter per country.
 *
 * Format: {PREFIX}-{NNNNN}  e.g. IE-00001, CZ-00001, ES-00001, RO-00001
 *
 * Uses atomic UPDATE … RETURNING on invoice_counter so parallel payments
 * never produce duplicate numbers. Same pattern as order-number.ts.
 */

const COUNTRY_PREFIX: Record<string, string> = {
  ie: "IE",
  cz: "CZ",
  es: "ES",
  sp: "SP",
  rm: "RO",
};

/** Returns null when the country has no invoice prefix (e.g. Portugal). */
export function invoicePrefix(countryCode: string): string | null {
  return COUNTRY_PREFIX[countryCode.toLowerCase()] ?? null;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
}

/** Atomically bump a counter row (any key) and return the next sequence. */
async function nextSeq(counterKey: string): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "invoice_counter" ("countryCode", "last_seq")
       VALUES ($1, 0)
       ON CONFLICT ("countryCode") DO NOTHING`,
      [counterKey],
    );

    const result = await client.query<{ last_seq: string }>(
      `UPDATE "invoice_counter"
       SET "last_seq" = "last_seq" + 1
       WHERE "countryCode" = $1
       RETURNING "last_seq"`,
      [counterKey],
    );

    await client.query("COMMIT");
    return Number(result.rows[0].last_seq);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function generateInvoiceNumber(countryCode: string): Promise<string> {
  const prefix = invoicePrefix(countryCode);
  if (!prefix) {
    throw new Error(`No invoice prefix for country: ${countryCode}`);
  }
  const seq = await nextSeq(countryCode.toLowerCase());
  return `${prefix}-${seq.toString().padStart(5, "0")}`;
}

/**
 * Credit-note number generator. Uses its OWN per-country sequence (counter key
 * `cn-{cc}`) so credit notes don't consume the invoice series, and prefixes
 * with `CN-` for a legally distinct document series: CN-IE-00001, CN-CZ-00001.
 */
export async function generateCreditNoteNumber(countryCode: string): Promise<string> {
  const prefix = invoicePrefix(countryCode);
  if (!prefix) {
    throw new Error(`No invoice prefix for country: ${countryCode}`);
  }
  const seq = await nextSeq(`cn-${countryCode.toLowerCase()}`);
  return `CN-${prefix}-${seq.toString().padStart(5, "0")}`;
}
