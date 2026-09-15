// Brazil pricing plans: guarded compare-and-set for PricingPlan / PlanTranslation display copy (pt-BR wording).
// Display text only — prices, credits, Stripe ids and rules are never written.
//   snapshot <new.json>                   read-only (DATABASE_URL); Brazil plans with translations
//   prepare  <snapshot> <plan> <manifest>  offline; entries {slug, locale, field, to} ("base" = PricingPlan row)
//   dry-run  <manifest>  /  apply <manifest> <sha256>  /  rollback <manifest> <sha256>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { connect } from './romania-seo-storage.mjs';
import { hash } from './patch-internal-links.mjs';

const BASE_FIELDS = ['name', 'shortDescription', 'longDescription', 'badgeLabel', 'notesTerms'];
const TRANSLATION_FIELDS = ['name', 'shortDescription', 'longDescription', 'notesTerms', 'features'];
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function prepare(snapshot, plan) {
  const byRow = new Map();
  for (const e of plan.entries) {
    const plans = snapshot.plans.filter(p => p.slug === e.slug && p.code === 'br');
    assert.equal(plans.length, 1, `Expected one Brazil plan ${e.slug}`);
    const p = plans[0], isBase = e.locale === 'base';
    const table = isBase ? 'PricingPlan' : 'PlanTranslation';
    assert((isBase ? BASE_FIELDS : TRANSLATION_FIELDS).includes(e.field), `Field not allowed: ${table}.${e.field}`);
    if (e.field === 'features') assert(Array.isArray(e.to) && e.to.every(s => typeof s === 'string'), 'features must be string[]');
    else assert(e.to === null || typeof e.to === 'string', `${e.field} must be string or null`);
    const row = isBase ? p : (p.translations ?? []).find(t => t.locale === e.locale);
    assert(row, `Missing ${e.slug}/${e.locale}`);
    const change = byRow.get(row.id) ?? { table, id: row.id, planId: p.id, slug: p.slug, locale: e.locale, updatedAt: row.updatedAt ?? null, before: {}, after: {} };
    assert(!same(e.to, row[e.field]), `No-op entry ${e.slug}/${e.locale}.${e.field}`);
    change.before[e.field] = row[e.field] ?? null;
    change.after[e.field] = e.to;
    byRow.set(row.id, change);
  }
  const changes = [...byRow.values()];
  assert(changes.length > 0, 'Nothing to change');
  return { version: 1, market: 'br', changes };
}

export async function run(client, manifest, mode) {
  assert.equal(manifest.version, 1); assert.equal(manifest.market, 'br'); assert(['dry-run', 'apply', 'rollback'].includes(mode));
  const results = [];
  await client.query(mode === 'dry-run' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    for (const c of manifest.changes) {
      assert(['PricingPlan', 'PlanTranslation'].includes(c.table));
      const fields = Object.keys(c.after);
      assert(fields.every(f => (c.table === 'PricingPlan' ? BASE_FIELDS : TRANSLATION_FIELDS).includes(f)), 'Field not allowed');
      const from = mode === 'rollback' ? c.after : c.before, to = mode === 'rollback' ? c.before : c.after;
      const lock = mode === 'dry-run' ? '' : ' FOR UPDATE';
      const { rows } = await client.query(`SELECT * FROM "${c.table}" WHERE id=$1${lock}`, [c.id]);
      assert.equal(rows.length, 1, `Missing ${c.id}`); const row = rows[0];
      const { rows: [scope] } = await client.query('SELECT co.code FROM "PricingPlan" p JOIN "Country" co ON co.id=p."countryId" WHERE p.id=$1', [c.planId]);
      assert.equal(scope?.code, 'br', `Plan outside Brazil: ${c.slug}`);
      const label = `${c.slug}/${c.locale}`;
      if (fields.every(f => same(row[f], to[f]))) { results.push({ row: label, status: 'already applied' }); continue; }
      for (const f of fields) assert(same(row[f], from[f]), `Source drift ${label}.${f}`);
      if (mode !== 'rollback' && c.updatedAt) assert.equal(new Date(row.updatedAt).toISOString(), new Date(c.updatedAt).toISOString(), `Metadata drift ${label}`);
      if (mode !== 'dry-run') {
        const sets = fields.map((f, i) => `"${f}"=$${i + 1}`);
        const touch = c.table === 'PricingPlan' ? ',"updatedAt"=CURRENT_TIMESTAMP' : '';
        const r = await client.query(`UPDATE "${c.table}" SET ${sets.join(',')}${touch} WHERE id=$${fields.length + 1}`, [...fields.map(f => to[f]), c.id]);
        assert.equal(r.rowCount, 1, `Row count ${label}`);
        const { rows: [back] } = await client.query(`SELECT * FROM "${c.table}" WHERE id=$1`, [c.id]);
        for (const f of fields) assert(same(back[f], to[f]), `Readback ${label}.${f}`);
      }
      results.push({ row: label, table: c.table, fields, status: mode === 'dry-run' ? 'ready' : mode });
    }
    await client.query('COMMIT'); return results;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
}

async function snapshot(output) {
  const client = await connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const plans = (await client.query(`SELECT p.*,co.code,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.locale) FROM "PlanTranslation" t WHERE t."planId"=p.id) AS translations
      FROM "PricingPlan" p JOIN "Country" co ON co.id=p."countryId" WHERE co.code='br' ORDER BY p."displayOrder"`)).rows;
    await client.query('COMMIT');
    fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), plans }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(plans.map(p => ({ slug: p.slug, isActive: p.isActive, name: p.name, translations: (p.translations ?? []).map(t => t.locale) }))));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, a, b, c] = process.argv.slice(2);
  if (mode === 'snapshot') await snapshot(a);
  else if (mode === 'prepare') {
    const manifest = prepare(JSON.parse(fs.readFileSync(a, 'utf8')), JSON.parse(fs.readFileSync(b, 'utf8')));
    fs.writeFileSync(c, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ sha256: hash(manifest), changes: manifest.changes.map(x => ({ row: `${x.slug}/${x.locale}`, table: x.table, fields: Object.keys(x.after) })) }));
  } else {
    const manifest = JSON.parse(fs.readFileSync(a, 'utf8'));
    if (mode !== 'dry-run') assert.equal(b, hash(manifest), 'Apply/rollback requires the exact reviewed manifest SHA-256');
    const client = await connect();
    try { console.log(JSON.stringify({ mode, sha256: hash(manifest), results: await run(client, manifest, mode) })); }
    finally { await client.end(); }
  }
}
