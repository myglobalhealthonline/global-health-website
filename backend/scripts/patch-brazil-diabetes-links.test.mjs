import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, rewrite, run } from './patch-brazil-diabetes-links.mjs';

const O = 'https://www.myglobalhealth.online';
const article = `<strong>Escrito pelo <a href="${O}/br/medicos/dr-tiago-miguel-figueira" rel="noopener noreferrer"><span>Dr. Tiago</span></a></strong>`
  + `<a href="${O}/br/medicos/dr-renato-sarmento" rel="noopener noreferrer">Dr. Renato Sarmento</a>`
  + `<a class="btn-primary" href="${O}/br/clinica-geral">Agendar consulta</a><a class="btn-secondary" href="/br/blog">Ler mais</a>`;

test('rewrites every retired /br/ link per locale and keeps link text', () => {
  const { html, count } = rewrite(article, 'es');
  assert.equal(count, 4);
  assert(html.includes('<strong>Escrito pelo <span>Dr. Tiago</span></strong>'));
  assert(html.includes(`href="${O}/brazil/es/doctors/dr-renato-sarmento"`));
  assert(html.includes(`href="${O}/brazil/es/gp-consultation-online">Agendar consulta</a>`));
  assert(html.includes(`href="${O}/brazil/es/blog">Ler mais</a>`));
  assert.throws(() => rewrite(`<a href="${O}/br/unknown">x</a>`, 'pt'), /Unhandled/);
});

test('prepare scopes to the Brazil post and patches body plus translations with /br/ links', () => {
  const post = { id: 'p', slug: 'diabetes-doenca-silenciosa', locale: 'PT', body: article, status: 'PUBLISHED', isActive: true, country: 'br', countries: ['br'], updatedAt: '2026-09-15T00:00:00Z',
    translations: [{ id: 'en', locale: 'EN', content: article, updatedAt: '2026-09-15T00:00:00Z' }, { id: 'cs', locale: 'CS', content: '<p>bez odkazu</p>' }] };
  const m = prepare({ posts: [post] });
  assert.deepEqual(m.changes.map(c => [c.table, c.locale, c.links]), [['BlogPost', 'PT', 4], ['BlogTranslation', 'EN', 4]]);
  assert.throws(() => prepare({ posts: [{ ...post, countries: ['br', 'pt'] }] }));
});

test('already applied is a no-op and drift rolls back', async () => {
  const manifest = { version: 1, changes: [{ table: 'BlogTranslation', field: 'content', id: 't', locale: 'EN', before: 'old', after: 'new', updatedAt: '2026-09-15T00:00:00Z' }] };
  const queries = []; let value = 'new';
  const client = { query: async (sql) => { queries.push(sql); return { rows: sql.startsWith('SELECT') ? [{ value, updatedAt: '2026-09-15T00:00:00Z' }] : [] }; } };
  assert.equal((await run(client, manifest, 'apply'))[0].status, 'already applied');
  assert(!queries.some(q => q.startsWith('UPDATE')));
  value = 'edited elsewhere';
  await assert.rejects(run(client, manifest, 'apply'), /Source drift/);
  assert.equal(queries.at(-1), 'ROLLBACK');
});
