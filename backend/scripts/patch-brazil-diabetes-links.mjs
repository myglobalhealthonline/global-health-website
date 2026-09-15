// Brazil SEO handoff R6: exact, reversible href-only fix for the diabetes article.
// Its PT body and EN/ES translations link to retired /br/* paths (all 404).
//   snapshot <new.json>            read-only (DATABASE_URL)
//   prepare  <snapshot> <manifest> offline
//   dry-run  <manifest>            read-only transaction
//   apply    <manifest> <sha256>   / rollback <manifest> <sha256>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { connect } from './romania-seo-storage.mjs';
import { hash } from './patch-internal-links.mjs';

const SLUG = 'diabetes-doenca-silenciosa';
const O = 'https://www.myglobalhealth.online';

/** Rewrites the retired /br/* links for one locale. Link text is never changed. */
export function rewrite(html, lang) {
  assert(['pt', 'en', 'es'].includes(lang), `Unsupported locale ${lang}`);
  let count = 0;
  const sub = (re, to) => { html = html.replace(re, (...m) => { count++; return typeof to === 'function' ? to(...m) : to; }); };
  sub(/href="(?:https:\/\/www\.myglobalhealth\.online)?\/br\/blog"/g, `href="${O}/brazil/${lang}/blog"`);
  sub(/href="(?:https:\/\/www\.myglobalhealth\.online)?\/br\/medicos\/dr-renato-sarmento"/g, `href="${O}/brazil/${lang}/doctors/dr-renato-sarmento"`);
  sub(/href="(?:https:\/\/www\.myglobalhealth\.online)?\/br\/clinica-geral"/g, `href="${O}/brazil/${lang}/gp-consultation-online"`);
  // No Brazil profile exists for Dr. Tiago: keep the name, drop the dead link.
  sub(/<a [^>]*href="(?:https:\/\/www\.myglobalhealth\.online)?\/br\/medicos\/dr-tiago-miguel-figueira"[^>]*>([\s\S]*?)<\/a>/g, (_, inner) => inner);
  assert(!/href="(?:https:\/\/www\.myglobalhealth\.online)?\/br\//.test(html), `Unhandled /br/ link left (${lang})`);
  return { html, count };
}

export function prepare(snapshot) {
  const posts = snapshot.posts.filter(p => p.slug === SLUG);
  assert.equal(posts.length, 1, `Expected one post ${SLUG}`);
  const p = posts[0];
  assert.equal(p.status, 'PUBLISHED'); assert.equal(p.isActive, true);
  assert.deepEqual([...new Set([p.country, ...(p.countries ?? [])].filter(Boolean))], ['br']);
  const changes = [];
  const add = (table, field, id, locale, before, updatedAt) => {
    if (!/\/br\//.test(before ?? '')) return;
    const { html: after, count } = rewrite(before, locale.toLowerCase());
    assert(count > 0 && after !== before, `No rewrite for ${table} ${locale}`);
    changes.push({ table, field, id, postId: p.id, slug: SLUG, locale, links: count, before, after, updatedAt });
  };
  add('BlogPost', 'body', p.id, p.locale, p.body, p.updatedAt);
  for (const t of p.translations ?? []) add('BlogTranslation', 'content', t.id, t.locale, t.content, t.updatedAt);
  assert(changes.length > 0, 'Nothing to change');
  return { version: 1, changes };
}

export async function run(client, manifest, mode) {
  assert.equal(manifest.version, 1); assert(['dry-run', 'apply', 'rollback'].includes(mode));
  const results = [];
  await client.query(mode === 'dry-run' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    for (const c of manifest.changes) {
      assert((c.table === 'BlogPost' && c.field === 'body') || (c.table === 'BlogTranslation' && c.field === 'content'));
      const from = mode === 'rollback' ? c.after : c.before, to = mode === 'rollback' ? c.before : c.after;
      const { rows } = await client.query(`SELECT "${c.field}" AS value,"updatedAt" FROM "${c.table}" WHERE id=$1${mode === 'dry-run' ? '' : ' FOR UPDATE'}`, [c.id]);
      assert.equal(rows.length, 1); const current = rows[0];
      if (current.value === to) { results.push({ table: c.table, locale: c.locale, status: 'already applied' }); continue; }
      assert.equal(current.value, from, `Source drift ${c.table} ${c.locale}`);
      if (mode !== 'rollback') assert.equal(new Date(current.updatedAt).toISOString(), new Date(c.updatedAt).toISOString(), `Metadata drift ${c.table} ${c.locale}`);
      if (mode !== 'dry-run') {
        const r = await client.query(`UPDATE "${c.table}" SET "${c.field}"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$2 AND "${c.field}"=$3`, [to, c.id, from]);
        assert.equal(r.rowCount, 1, `Concurrent change ${c.table} ${c.locale}`);
      }
      results.push({ table: c.table, locale: c.locale, links: c.links, status: mode === 'dry-run' ? 'ready' : mode });
    }
    await client.query('COMMIT'); return results;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
}

async function snapshot(output) {
  const client = await connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const posts = (await client.query(`SELECT p.id,p.slug,p.locale,p.body,p.status,p."isActive",p."updatedAt",c.code AS country,
      (SELECT jsonb_agg(jsonb_build_object('id',t.id,'locale',t.locale,'slug',t.slug,'content',t.content,'updatedAt',t."updatedAt")) FROM "BlogTranslation" t WHERE t."postId"=p.id) AS translations,
      (SELECT jsonb_agg(c2.code) FROM "BlogPostCountry" pc JOIN "Country" c2 ON c2.id=pc."countryId" WHERE pc."postId"=p.id) AS countries
      FROM "BlogPost" p LEFT JOIN "Country" c ON c.id=p."countryId" WHERE p.slug=$1`, [SLUG])).rows;
    await client.query('COMMIT');
    fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), posts }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(posts.map(p => ({ slug: p.slug, country: p.country, countries: p.countries, locale: p.locale, bodyBrLinks: (p.body.match(/\/br\//g) ?? []).length, translations: (p.translations ?? []).map(t => ({ locale: t.locale, brLinks: (t.content?.match(/\/br\//g) ?? []).length })) }))));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, input, outputOrHash] = process.argv.slice(2);
  if (mode === 'snapshot') await snapshot(input);
  else if (mode === 'prepare') {
    const manifest = prepare(JSON.parse(fs.readFileSync(input, 'utf8')));
    fs.writeFileSync(outputOrHash, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ sha256: hash(manifest), changes: manifest.changes.map(c => ({ table: c.table, locale: c.locale, links: c.links })) }));
  } else {
    const manifest = JSON.parse(fs.readFileSync(input, 'utf8'));
    if (mode !== 'dry-run') assert.equal(outputOrHash, hash(manifest), 'Apply/rollback requires the exact reviewed manifest SHA-256');
    const client = await connect();
    try { console.log(JSON.stringify({ mode, sha256: hash(manifest), results: await run(client, manifest, mode) })); }
    finally { await client.end(); }
  }
}
