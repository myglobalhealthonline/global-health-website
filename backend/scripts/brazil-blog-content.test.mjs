import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, run } from './brazil-blog-content.mjs';

const post = { id: 'p1', slug: 'diabetes-doenca-silenciosa', locale: 'PT', country: null, countries: ['br'], updatedAt: '2026-09-15T00:00:00Z',
  body: '<p>Escrito pelo Dr. Tiago</p><p>globalhealth@myglobalhealth.online</p>', authorDoctorId: 'tiago', reviewerDoctorId: 'renato', lastReviewedAt: '2026-07-21T00:00:00Z',
  translations: [{ id: 't-en', locale: 'EN', content: '<p>Written by Dr. Tiago</p>', updatedAt: '2026-09-15T00:00:00Z' }] };

test('prepare groups post and translation edits, Brazil posts only', () => {
  const m = prepare({ posts: [post] }, { entries: [
    { slug: post.slug, locale: 'PT', field: 'authorDoctorId', to: 'renato' },
    { slug: post.slug, locale: 'PT', field: 'body', from: 'globalhealth@', to: 'info@' },
    { slug: post.slug, locale: 'EN', field: 'content', from: 'Dr. Tiago', to: 'Dr. Renato Sarmento' },
    { slug: post.slug, locale: 'PT', field: 'lastReviewedAt', to: '2026-09-15T00:00:00.000Z' },
  ] });
  assert.deepEqual(m.changes.map(c => [c.table, c.locale, Object.keys(c.after)]), [['BlogPost', 'PT', ['authorDoctorId', 'body', 'lastReviewedAt']], ['BlogTranslation', 'EN', ['content']]]);
  assert.equal(m.changes[0].before.lastReviewedAt, '2026-07-21T00:00:00.000Z');
  assert.throws(() => prepare({ posts: [{ ...post, countries: ['br', 'pt'] }] }, { entries: [{ slug: post.slug, locale: 'PT', field: 'authorDoctorId', to: 'renato' }] }), /outside Brazil/);
  assert.throws(() => prepare({ posts: [post] }, { entries: [{ slug: post.slug, locale: 'PT', field: 'status', to: 'DRAFT' }] }), /not allowed/);
  assert.throws(() => prepare({ posts: [post] }, { entries: [{ slug: post.slug, locale: 'PT', field: 'authorDoctorId', to: 'tiago' }] }), /No-op/);
});

function fakeClient(row, country = 'br') {
  const queries = [];
  return { queries, query: async (sql, params) => {
    queries.push(sql);
    if (sql.startsWith('SELECT *')) return { rows: [row] };
    if (sql.startsWith('SELECT c.code')) return { rows: [{ country: null, countries: [country] }] };
    if (sql.startsWith('UPDATE')) { row.authorDoctorId = params[0]; return { rowCount: 1 }; }
    return { rows: [] };
  } };
}

test('apply writes with drift, scope and rollback guards', async () => {
  const manifest = { version: 1, market: 'br', changes: [{ table: 'BlogPost', id: 'p1', postId: 'p1', slug: post.slug, locale: 'PT', updatedAt: post.updatedAt, before: { authorDoctorId: 'tiago' }, after: { authorDoctorId: 'renato' } }] };
  assert.equal((await run(fakeClient({ ...post }), manifest, 'apply'))[0].status, 'apply');
  assert.equal((await run(fakeClient({ ...post, authorDoctorId: 'renato' }), manifest, 'apply'))[0].status, 'already applied');
  const drift = fakeClient({ ...post, authorDoctorId: 'someone' });
  await assert.rejects(run(drift, manifest, 'apply'), /Source drift/);
  assert.equal(drift.queries.at(-1), 'ROLLBACK');
  await assert.rejects(run(fakeClient({ ...post }, 'pt'), manifest, 'apply'), /outside Brazil/);
});
