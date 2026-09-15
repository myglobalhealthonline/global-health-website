import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, run } from './brazil-plan-content.mjs';

const plan = { id: 'p1', slug: 'plano-essencial-de-saude', code: 'br', updatedAt: '2026-09-15T00:00:00Z', name: 'Plano Essencial', monthlyPriceCents: 15000,
  translations: [{ id: 't-pt', locale: 'PT', name: 'Plano Essencial', features: ['Marcação online e acesso aos seus registos clínicos'] }] };

test('prepare writes display fields only, Brazil plans only', () => {
  const m = prepare({ plans: [plan] }, { entries: [{ slug: plan.slug, locale: 'PT', field: 'features', to: ['Agendamento online e acesso aos seus registros clínicos'] }] });
  assert.deepEqual(m.changes.map(c => [c.table, c.locale, Object.keys(c.after)]), [['PlanTranslation', 'PT', ['features']]]);
  assert.throws(() => prepare({ plans: [plan] }, { entries: [{ slug: plan.slug, locale: 'base', field: 'monthlyPriceCents', to: '1' }] }), /not allowed/);
  assert.throws(() => prepare({ plans: [{ ...plan, code: 'pt' }] }, { entries: [{ slug: plan.slug, locale: 'base', field: 'name', to: 'X' }] }), /Brazil plan/);
});

test('apply guards drift and market', async () => {
  const manifest = { version: 1, market: 'br', changes: [{ table: 'PlanTranslation', id: 't-pt', planId: 'p1', slug: plan.slug, locale: 'PT', updatedAt: null, before: { features: ['old'] }, after: { features: ['new'] } }] };
  const client = (row, code = 'br') => ({ query: async (sql, params) => {
    if (sql.startsWith('SELECT *')) return { rows: [row] };
    if (sql.startsWith('SELECT co.code')) return { rows: [{ code }] };
    if (sql.startsWith('UPDATE')) { row.features = params[0]; return { rowCount: 1 }; }
    return { rows: [] };
  } });
  assert.equal((await run(client({ features: ['old'] }), manifest, 'apply'))[0].status, 'apply');
  assert.equal((await run(client({ features: ['new'] }), manifest, 'apply'))[0].status, 'already applied');
  await assert.rejects(run(client({ features: ['edited'] }), manifest, 'apply'), /Source drift/);
  await assert.rejects(run(client({ features: ['old'] }, 'pt'), manifest, 'apply'), /outside Brazil/);
});
