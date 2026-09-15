// Brazil SEO articles: guarded compare-and-set for BlogPost / BlogTranslation copy and attribution.
// Blogs are outside the clinical gate; the admin form is not used (it resets lastReviewedAt).
//   snapshot <new.json>                   read-only (DATABASE_URL); every Brazil post with translations
//   prepare  <snapshot> <plan> <manifest>  offline; plan entries:
//            {slug, locale, field, from, to}  exact-once text replacement (locale = post locale or translation locale)
//            {slug, locale, field, to}        whole-value set (text, doctor id, ISO date or null)
//   dry-run  <manifest>  /  apply <manifest> <sha256>  /  rollback <manifest> <sha256>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { connect } from './romania-seo-storage.mjs';
import { hash } from './patch-internal-links.mjs';

const POST_FIELDS = ['body', 'excerpt', 'seoTitle', 'seoDescription', 'authorDoctorId', 'reviewerDoctorId', 'authorDisplayName', 'reviewerDisplayName', 'lastReviewedAt'];
const TRANSLATION_FIELDS = ['content', 'excerpt', 'seoTitle', 'seoDesc'];
const TEXT = new Set(['body', 'excerpt', 'seoTitle', 'seoDescription', 'content', 'seoDesc', 'authorDisplayName', 'reviewerDisplayName']);
const norm = (f, v) => (f === 'lastReviewedAt' && v ? new Date(v).toISOString() : v ?? null);
const same = (f, a, b) => norm(f, a) === norm(f, b);

export function prepare(snapshot, plan) {
  const byRow = new Map();
  for (const e of plan.entries) {
    const posts = snapshot.posts.filter(p => p.slug === e.slug);
    assert.equal(posts.length, 1, `Expected one Brazil post ${e.slug}`);
    const p = posts[0];
    assert.deepEqual([...new Set([p.country, ...(p.countries ?? [])].filter(Boolean))], ['br'], `Post outside Brazil: ${e.slug}`);
    const isPost = e.locale === p.locale;
    const table = isPost ? 'BlogPost' : 'BlogTranslation';
    assert((isPost ? POST_FIELDS : TRANSLATION_FIELDS).includes(e.field), `Field not allowed: ${table}.${e.field}`);
    const row = isPost ? p : (p.translations ?? []).find(t => t.locale === e.locale);
    assert(row, `Missing ${e.slug}/${e.locale}`);
    const change = byRow.get(row.id) ?? { table, id: row.id, postId: p.id, slug: p.slug, locale: e.locale, updatedAt: row.updatedAt, before: {}, after: {} };
    const current = e.field in change.after ? change.after[e.field] : row[e.field];
    let next;
    if ('from' in e) {
      assert(TEXT.has(e.field) && typeof current === 'string', `Replacement needs text: ${e.slug}/${e.locale}.${e.field}`);
      assert.equal(current.split(e.from).length - 1, 1, `Replacement must match exactly once: ${e.slug}/${e.locale}.${e.field} "${String(e.from).slice(0, 60)}"`);
      next = current.replace(e.from, () => e.to);
    } else {
      next = norm(e.field, e.to);
    }
    assert(!same(e.field, next, current), `No-op entry ${e.slug}/${e.locale}.${e.field}`);
    if (!(e.field in change.before)) change.before[e.field] = norm(e.field, row[e.field]);
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
      assert(['BlogPost', 'BlogTranslation'].includes(c.table));
      assert(fields.every(f => (c.table === 'BlogPost' ? POST_FIELDS : TRANSLATION_FIELDS).includes(f)), 'Field not allowed');
      const from = mode === 'rollback' ? c.after : c.before, to = mode === 'rollback' ? c.before : c.after;
      const lock = mode === 'dry-run' ? '' : ' FOR UPDATE';
      const { rows } = await client.query(`SELECT * FROM "${c.table}" WHERE id=$1${lock}`, [c.id]);
      assert.equal(rows.length, 1, `Missing ${c.id}`); const row = rows[0];
      const { rows: [scope] } = await client.query(`SELECT c.code AS country,(SELECT jsonb_agg(c2.code) FROM "BlogPostCountry" pc JOIN "Country" c2 ON c2.id=pc."countryId" WHERE pc."postId"=p.id) AS countries FROM "BlogPost" p LEFT JOIN "Country" c ON c.id=p."countryId" WHERE p.id=$1`, [c.postId]);
      assert.deepEqual([...new Set([scope?.country, ...(scope?.countries ?? [])].filter(Boolean))], ['br'], `Post outside Brazil: ${c.slug}`);
      const label = `${c.slug}/${c.locale}`;
      if (fields.every(f => same(f, row[f], to[f]))) { results.push({ row: label, status: 'already applied' }); continue; }
      for (const f of fields) assert(same(f, row[f], from[f]), `Source drift ${label}.${f}`);
      if (mode !== 'rollback') assert.equal(new Date(row.updatedAt).toISOString(), new Date(c.updatedAt).toISOString(), `Metadata drift ${label}`);
      if (mode !== 'dry-run') {
        const sets = fields.map((f, i) => `"${f}"=$${i + 1}`);
        const r = await client.query(`UPDATE "${c.table}" SET ${sets.join(',')},"updatedAt"=CURRENT_TIMESTAMP WHERE id=$${fields.length + 1}`, [...fields.map(f => to[f]), c.id]);
        assert.equal(r.rowCount, 1, `Row count ${label}`);
        const { rows: [back] } = await client.query(`SELECT * FROM "${c.table}" WHERE id=$1`, [c.id]);
        for (const f of fields) assert(same(f, back[f], to[f]), `Readback ${label}.${f}`);
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
    const posts = (await client.query(`SELECT p.*,c.code AS country,
      (SELECT jsonb_agg(c2.code) FROM "BlogPostCountry" pc JOIN "Country" c2 ON c2.id=pc."countryId" WHERE pc."postId"=p.id) AS countries,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.locale) FROM "BlogTranslation" t WHERE t."postId"=p.id) AS translations
      FROM "BlogPost" p LEFT JOIN "Country" c ON c.id=p."countryId"
      WHERE c.code='br' OR EXISTS (SELECT 1 FROM "BlogPostCountry" pc JOIN "Country" c3 ON c3.id=pc."countryId" WHERE pc."postId"=p.id AND c3.code='br')
      ORDER BY p.slug`)).rows;
    await client.query('COMMIT');
    fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), posts }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(posts.map(p => ({ slug: p.slug, locale: p.locale, status: p.status, isActive: p.isActive, authorDoctorId: p.authorDoctorId, reviewerDoctorId: p.reviewerDoctorId, lastReviewedAt: p.lastReviewedAt, translations: (p.translations ?? []).map(t => t.locale) }))));
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
