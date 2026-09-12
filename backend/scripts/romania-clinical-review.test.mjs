import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { assertRomaniaClinicalChanges, reviewedRomaniaTransaction } from '../src/content/romania-clinical-review.ts';
import { rehearse } from './prepare-romania-seo.mjs';
import { verifyApproval, mutateGroup } from './apply-romania-seo.mjs';
const root = new URL('../../seo/romania/', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p,root)));
const before = read('raw/storage-preflight-with-links-2026-09-13.json').data;
const manifest = read('content-briefs/storage-mutation-manifest-2026-09-13.json');
const approval = read('clinical-approval-2026-09-13.json');

test('every approved group passes; unknown clinical changes fail; operational edits and identical FAQ resaves pass', () => {
  let state = before;
  for (const group of manifest.groups) {
    verifyApproval(manifest,approval,group.key);
    const next = rehearse(state,group);
    assert.doesNotThrow(() => assertRomaniaClinicalChanges(state,next));
    state = next;
  }
  const operational = structuredClone(state);
  operational.services[0].basePriceCents = 999;
  operational.doctors[0].languages = ['Romanian'];
  operational.doctors[0].active = false;
  assert.doesNotThrow(() => assertRomaniaClinicalChanges(state,operational));
  const sameFaqs = structuredClone(state);
  for (const [i,f] of sameFaqs.doctorFaqs.entries()) f.id = `new-id-${i}`;
  assert.doesNotThrow(() => assertRomaniaClinicalChanges(state,sameFaqs));
  const bad = structuredClone(state);
  bad.doctorFaqs[0].answer = 'Guaranteed same-day Spanish consultation';
  assert.throws(() => assertRomaniaClinicalChanges(state,bad), /requires approval/);
  bad.doctorFaqs = structuredClone(state.doctorFaqs);
  bad.serviceTranslations[0].seoTitle = 'Unreviewed';
  assert.throws(() => assertRomaniaClinicalChanges(state,bad), /requires approval/);
  const tampered = structuredClone(manifest);
  tampered.groups[0].changes[0].after.seoTitle = 'Tampered';
  assert.throws(() => verifyApproval(tampered,approval,tampered.groups[0].key), /manifest changed/);
});

test('transaction wrapper validates post-write content and propagates failure before commit', async () => {
  let rolledBack = false, committed = false;
  const staged = structuredClone(before);
  const tableKeys = { Country:'country',Service:'services',ServiceTranslation:'serviceTranslations',ServiceFaq:'serviceFaqs',ServiceFaqTranslation:'serviceFaqTranslations',ServiceDoctor:'assignments',Doctor:'doctors',DoctorCountry:'doctorCountries',DoctorTranslation:'doctorTranslations',DoctorMarketTranslation:'doctorMarketTranslations',DoctorFaq:'doctorFaqs',CountryLocale:'countryLocales',ServiceLink:'serviceLinks',ServiceLinkTranslation:'serviceLinkTranslations' };
  const client = { $transaction: async (work,options) => {
    assert.equal(options.isolationLevel,'Serializable');
    const tx = { country:{findUnique:async()=>({id:before.country.id})}, $queryRawUnsafe:async sql => {
      const table = sql.match(/FROM "(\w+)"/)[1];
      return structuredClone(table === 'Country' ? [staged.country] : staged[tableKeys[table]]);
    }};
    try { const result = await work(tx); committed=true; return result; }
    catch(e) { rolledBack=true; throw e; }
  }};
  await assert.rejects(reviewedRomaniaTransaction(client,async()=>{ staged.doctorFaqs[0].answer='Unreviewed'; }), /requires approval/);
  assert.equal(rolledBack,true); assert.equal(committed,false);
});

test('updater parameterizes copy and rejects fields outside the reviewed surface', async () => {
  const calls=[];
  await mutateGroup({query:async(sql,values)=>{calls.push({sql,values});return {rowCount:1};}},manifest.groups.find(g => g.key.startsWith('service:')));
  assert(calls.every(c=>c.sql.includes('$1')));
  assert(calls.some(c=>c.sql.startsWith('INSERT INTO')));
  await assert.rejects(mutateGroup({query:async()=>({rowCount:1})},{changes:[{action:'update',table:'services',id:'x',after:{basePriceCents:1}}]}), /Unapproved field/);
});
