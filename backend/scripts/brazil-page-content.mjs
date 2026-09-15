// Brazil SEO handoff D1: guarded compare-and-set for PageContentTranslation copy (HOME, DOCTORS_INDEX).
// PageContent is outside the clinical gate; the admin form is not used. Brazil rows only.
//   snapshot <new.json>                   read-only (DATABASE_URL)
//   prepare  <snapshot> <plan> <manifest>  offline; plan entries {pageKey, locale, field, to} or {..., from, to}
//   dry-run  <manifest>                    read-only transaction
//   apply    <manifest> <sha256>  /  rollback <manifest> <sha256>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { connect } from './romania-seo-storage.mjs';
import { hash } from './patch-internal-links.mjs';

const PAGE_KEYS = ['HOME', 'DOCTORS_INDEX'];
const TEXT = ['heroTitle', 'heroSubtitle', 'heroTitleLead', 'heroTitleAccent', 'ctaLabel', 'intro', 'whoForTitle', 'whoForIntro', 'whyChooseTitle', 'disclaimerShort', 'body', 'seoTitle', 'seoDescription'];
const JSON_FIELDS = ['whoForItems', 'whyChooseItems', 'faq', 'disclaimerParagraphs'];
const same = (a, b) => hash({ v: a ?? null }) === hash({ v: b ?? null });

export function prepare(snapshot, plan) {
  const byRow = new Map();
  for (const e of plan.entries) {
    assert(PAGE_KEYS.includes(e.pageKey), `Page not allowed: ${e.pageKey}`);
    assert(TEXT.includes(e.field) || JSON_FIELDS.includes(e.field), `Field not allowed: ${e.field}`);
    const rows = snapshot.rows.filter(r => r.code === 'br' && r.pageKey === e.pageKey && r.locale === e.locale);
    assert.equal(rows.length, 1, `Expected one Brazil row ${e.pageKey}/${e.locale}`);
    const row = rows[0];
    const change = byRow.get(row.id) ?? { id: row.id, pageKey: row.pageKey, locale: row.locale, updatedAt: row.updatedAt, before: {}, after: {} };
    const current = e.field in change.after ? change.after[e.field] : row[e.field];
    let next;
    if ('from' in e) {
      assert(TEXT.includes(e.field) && typeof current === 'string', `Replacement needs a text value: ${e.pageKey}/${e.locale}.${e.field}`);
      assert.equal(current.split(e.from).length - 1, 1, `Replacement must match exactly once: ${e.pageKey}/${e.locale}.${e.field} "${String(e.from).slice(0, 60)}"`);
      next = current.replace(e.from, () => e.to);
    } else {
      if (TEXT.includes(e.field)) assert(e.to === null || typeof e.to === 'string', `Text field needs string or null: ${e.field}`);
      if (e.field === 'faq' && e.to !== null) assert(Array.isArray(e.to) && e.to.every(f => typeof f.question === 'string' && typeof f.answer === 'string'), 'faq shape');
      else if (JSON_FIELDS.includes(e.field) && e.to !== null) assert(Array.isArray(e.to) && e.to.every(s => typeof s === 'string'), `${e.field} must be string[]`);
      next = e.to;
    }
    assert(!same(next, current), `No-op entry ${e.pageKey}/${e.locale}.${e.field}`);
    if (!(e.field in change.before)) change.before[e.field] = row[e.field] ?? null;
    change.after[e.field] = next;
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
      const fields = Object.keys(c.after);
      assert(fields.every(f => TEXT.includes(f) || JSON_FIELDS.includes(f)) && PAGE_KEYS.includes(c.pageKey));
      const from = mode === 'rollback' ? c.after : c.before, to = mode === 'rollback' ? c.before : c.after;
      const { rows } = await client.query(`SELECT t.*,p."pageKey",co.code FROM "PageContentTranslation" t JOIN "PageContent" p ON p.id=t."pageContentId" JOIN "Country" co ON co.id=p."countryId" WHERE t.id=$1${mode === 'dry-run' ? '' : ' FOR UPDATE OF t'}`, [c.id]);
      assert.equal(rows.length, 1, `Missing ${c.id}`); const row = rows[0];
      assert.equal(row.code, 'br', `Row outside Brazil: ${c.id}`); assert.equal(row.pageKey, c.pageKey, 'Page drift'); assert.equal(row.locale, c.locale, 'Locale drift');
      const label = `${c.pageKey}/${c.locale}`;
      if (fields.every(f => same(row[f], to[f]))) { results.push({ row: label, status: 'already applied' }); continue; }
      for (const f of fields) assert(same(row[f], from[f]), `Source drift ${label}.${f}`);
      if (mode !== 'rollback') assert.equal(new Date(row.updatedAt).toISOString(), new Date(c.updatedAt).toISOString(), `Metadata drift ${label}`);
      if (mode !== 'dry-run') {
        const sets = fields.map((f, i) => `"${f}"=$${i + 1}${JSON_FIELDS.includes(f) ? '::jsonb' : ''}`);
        const values = fields.map(f => (JSON_FIELDS.includes(f) && to[f] !== null ? JSON.stringify(to[f]) : to[f]));
        const r = await client.query(`UPDATE "PageContentTranslation" SET ${sets.join(',')},"updatedAt"=CURRENT_TIMESTAMP WHERE id=$${fields.length + 1}`, [...values, c.id]);
        assert.equal(r.rowCount, 1, `Row count ${label}`);
        const { rows: [back] } = await client.query('SELECT * FROM "PageContentTranslation" WHERE id=$1', [c.id]);
        for (const f of fields) assert(same(back[f], to[f]), `Readback ${label}.${f}`);
      }
      results.push({ row: label, fields, status: mode === 'dry-run' ? 'ready' : mode });
    }
    await client.query('COMMIT'); return results;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
}

async function snapshot(output) {
  const client = await connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows = (await client.query(`SELECT t.*,p."pageKey",p.status,p."isActive",co.code FROM "PageContentTranslation" t JOIN "PageContent" p ON p.id=t."pageContentId" JOIN "Country" co ON co.id=p."countryId" WHERE co.code='br' AND p."pageKey"::text=ANY($1::text[]) ORDER BY p."pageKey",t.locale`, [PAGE_KEYS])).rows;
    await client.query('COMMIT');
    fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), rows }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(rows.map(r => ({ pageKey: r.pageKey, locale: r.locale, status: r.status, isActive: r.isActive, seoTitle: r.seoTitle, faq: Array.isArray(r.faq) ? r.faq.length : null }))));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, a, b, c] = process.argv.slice(2);
  if (mode === 'snapshot') await snapshot(a);
  else if (mode === 'prepare') {
    const manifest = prepare(JSON.parse(fs.readFileSync(a, 'utf8')), JSON.parse(fs.readFileSync(b, 'utf8')));
    fs.writeFileSync(c, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ sha256: hash(manifest), changes: manifest.changes.map(x => ({ row: `${x.pageKey}/${x.locale}`, fields: Object.keys(x.after) })) }));
  } else {
    const manifest = JSON.parse(fs.readFileSync(a, 'utf8'));
    if (mode !== 'dry-run') assert.equal(b, hash(manifest), 'Apply/rollback requires the exact reviewed manifest SHA-256');
    const client = await connect();
    try { console.log(JSON.stringify({ mode, sha256: hash(manifest), results: await run(client, manifest, mode) })); }
    finally { await client.end(); }
  }
}
