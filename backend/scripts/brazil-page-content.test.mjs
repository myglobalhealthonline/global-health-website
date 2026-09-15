import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, run } from './brazil-page-content.mjs';

const row = { id: 't1', code: 'br', pageKey: 'HOME', locale: 'EN', updatedAt: '2026-09-15T00:00:00Z', seoTitle: 'Registered GPs & Specialists', intro: 'Book a GP or specialist today.', whoForItems: ['a', 'Specialist review'] };

test('prepare sets, replaces and clears Brazil fields only', () => {
  const m = prepare({ rows: [row, { ...row, id: 'pt', code: 'pt' }] }, { entries: [
    { pageKey: 'HOME', locale: 'EN', field: 'seoTitle', to: null },
    { pageKey: 'HOME', locale: 'EN', field: 'intro', from: ' or specialist', to: '' },
    { pageKey: 'HOME', locale: 'EN', field: 'whoForItems', to: ['a', 'General care'] },
  ] });
  assert.equal(m.changes.length, 1);
  assert.deepEqual(m.changes[0].after, { seoTitle: null, intro: 'Book a GP today.', whoForItems: ['a', 'General care'] });
  assert.equal(m.changes[0].before.seoTitle, 'Registered GPs & Specialists');
  assert.throws(() => prepare({ rows: [row] }, { entries: [{ pageKey: 'PRICING', locale: 'EN', field: 'seoTitle', to: null }] }), /Page not allowed/);
  assert.throws(() => prepare({ rows: [row] }, { entries: [{ pageKey: 'HOME', locale: 'EN', field: 'intro', from: 'missing', to: '' }] }), /exactly once/);
  assert.throws(() => prepare({ rows: [{ ...row, code: 'pt' }] }, { entries: [{ pageKey: 'HOME', locale: 'EN', field: 'seoTitle', to: null }] }), /Expected one Brazil row/);
});

function fakeClient(current) {
  const queries = [];
  return { queries, query: async (sql, params) => {
    queries.push(sql);
    if (sql.startsWith('SELECT t.*')) return { rows: [current] };
    if (sql.startsWith('UPDATE')) { current.seoTitle = params[0]; return { rowCount: 1 }; }
    if (sql.startsWith('SELECT *')) return { rows: [current] };
    return { rows: [] };
  } };
}

test('apply writes, rejects drift and other markets, rolls back on failure', async () => {
  const manifest = { version: 1, market: 'br', changes: [{ id: 't1', pageKey: 'HOME', locale: 'EN', updatedAt: row.updatedAt, before: { seoTitle: row.seoTitle }, after: { seoTitle: null } }] };
  const ok = fakeClient({ ...row });
  assert.equal((await run(ok, manifest, 'apply'))[0].status, 'apply');
  assert.equal((await run(fakeClient({ ...row, seoTitle: null }), manifest, 'apply'))[0].status, 'already applied');
  const drift = fakeClient({ ...row, seoTitle: 'edited' });
  await assert.rejects(run(drift, manifest, 'apply'), /Source drift/);
  assert.equal(drift.queries.at(-1), 'ROLLBACK');
  await assert.rejects(run(fakeClient({ ...row, code: 'pt' }), manifest, 'apply'), /outside Brazil/);
});
