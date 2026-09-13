// Content-only export. No patient, account, banking, or secret fields are selected.
import pg from 'pg';
import { writeFileSync } from 'node:fs';

import { readRomaniaContent } from "../src/content/romania-clinical-review.ts";
export const readRomania = async client => JSON.parse(JSON.stringify(await readRomaniaContent(async (sql, values) => (await client.query(sql, values)).rows)));

export async function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required through established secret configuration');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  await client.connect();
  return client;
}

if (process.argv[1]?.endsWith('romania-seo-storage.mjs')) {
  const output = process.argv[2];
  if (!output) throw new Error('Usage: node backend/scripts/romania-seo-storage.mjs <new-snapshot.json>');
  const client = await connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const data = await readRomania(client);
    await client.query('COMMIT');
    writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), data }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ country: data.country, counts: Object.fromEntries(Object.entries(data).filter(([,v]) => Array.isArray(v)).map(([k,v]) => [k,v.length])) }));
  } finally { await client.end(); }
}
