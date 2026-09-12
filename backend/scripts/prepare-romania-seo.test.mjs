import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRomania, rehearse, hash } from './prepare-romania-seo.mjs';
const root = new URL('../../seo/romania/', import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(file, root), 'utf8'));
const snapshot = read('raw/storage-preflight-with-links-2026-09-13.json');
const services = read('content-briefs/service-drafts.json'), doctors = read('content-briefs/doctor-drafts.json');
const fresh = read('raw/implementation-public-preflight-2026-09-13.json');
const source = d => { const s = read(d.source).data; return s.service ?? s.doctor; };
const plan = (s = snapshot, drafts = services, pub = fresh) => prepareRomania(s, drafts, doctors, pub, source);

test('all six locales migrate coherently; unrelated rows survive; repeats are safe in rehearsal', () => {
  const result = plan();
  assert.deepEqual(result.blockers, []);
  assert.equal(result.groups.length, 20);
  const originalHash = hash(snapshot);
  let state = snapshot.data;
  for (const group of result.groups) {
    const next = rehearse(state, group);
    assert.deepEqual(rehearse(next, group), next);
    const touched = new Set(group.changes.map(c => `${c.table}:${c.id}`));
    for (const [table, rows] of Object.entries(state).filter(([,v]) => Array.isArray(v))) {
      for (const row of rows.filter(r => !touched.has(`${table}:${r.id}`))) {
        assert.deepEqual(next[table].find(r => r.id === row.id), row);
      }
    }
    state = next;
  }
  assert.equal(state.serviceFaqs.length, 64);
  assert.equal(state.serviceFaqTranslations.length, 384);
  assert.equal(state.doctorFaqs.length, 108);
  for (const faq of state.serviceFaqs) {
    const tr = state.serviceFaqTranslations.filter(t => t.serviceFaqId === faq.id);
    assert.deepEqual(tr.map(t => t.locale).sort(), ['CS','DE','EN','ES','PT','RO']);
    const ro = tr.find(t => t.locale === 'RO');
    assert.equal(faq.question, ro.question);
    assert.equal(faq.answer, ro.answer);
  }
  assert.equal(hash(snapshot), originalHash, 'Planner/rehearsal must never mutate source');
});

test('source drift, missing locale, hidden FAQ and shared doctor scope hold affected groups', () => {
  const s = structuredClone(snapshot);
  const id = s.data.services.find(x => x.slug === 'consultatie-pediatrie').id;
  s.data.serviceTranslations.find(t => t.serviceId === id && t.locale === 'EN').heroTitle = 'Newer work';
  assert(plan(s).blockers.some(b => b.key === 'service:consultatie-pediatrie'));
  const missing = services.filter(d => !(d.slug === 'consultatie-neurologie' && d.locale === 'de'));
  assert(plan(snapshot, missing).blockers.some(b => b.key === 'service:consultatie-neurologie'));
  const hidden = structuredClone(snapshot);
  hidden.data.serviceFaqs.push({ id: 'hidden', serviceId: id, isVisible: false });
  assert(plan(hidden).blockers.some(b => b.key === 'service:consultatie-pediatrie'));
  const shared = structuredClone(snapshot);
  const doctorId = shared.data.doctors.find(d => d.slug === 'dr-alexandra-palaga').id;
  shared.data.doctorCountries.push({ doctorId, countryId: 'other-market' });
  assert(plan(shared).blockers.some(b => b.key === 'doctor:dr-alexandra-palaga'));
  const pub = structuredClone(fresh);
  pub.results.find(r => r.url.includes('/consultatie-neurologie')).data.seoTitle = 'New';
  assert(plan(snapshot, services, pub).blockers.some(b => b.key === 'service:consultatie-neurologie'));
});

test('a late row failure leaves the rehearsal input unchanged; doctor FAQ edits change approval hash', () => {
  const result = plan(), group = result.groups.find(g => g.key === 'service:consultatie-pediatrie');
  const broken = structuredClone(group);
  broken.changes.push({ action: 'update', table: 'serviceTranslations', id: 'missing', before: {}, after: { seoTitle: 'X' } });
  const before = hash(snapshot.data);
  assert.throws(() => rehearse(snapshot.data, broken), /Missing row/);
  assert.equal(hash(snapshot.data), before);
  const changed = structuredClone(doctors);
  changed.find(d => d.slug === 'dr-alexandra-palaga').faqPatches[0].after.answer += ' Revised.';
  const revised = prepareRomania(snapshot, services, changed, fresh, source);
  assert.notEqual(revised.groups.find(g => g.key === 'doctor:dr-alexandra-palaga').approvalSha256,
    result.groups.find(g => g.key === 'doctor:dr-alexandra-palaga').approvalSha256);
});
