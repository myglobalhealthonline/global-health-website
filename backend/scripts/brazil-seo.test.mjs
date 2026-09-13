import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareBrazil,hash,rehearse} from './prepare-brazil-seo.mjs';
import {executeSpainGroup,verifySpainApproval} from './apply-spain-seo.mjs';
import {assertBrazilClinicalChanges,APPROVED_BRAZIL_STATES,BRAZIL_REVIEW_POLICY,reviewedRomaniaTransaction} from '../src/content/romania-clinical-review.ts';
// These integration checks require the ignored, content-only local evidence package.
if (!fs.existsSync('seo/brazil/raw/storage-preflight-2026-09-13.json')) {
 test('Brazil evidence integration checks', {skip:'Local Brazil evidence package required'}, () => {});
} else {
const root='seo/brazil',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`));
const snapshot=read('raw/storage-preflight-2026-09-13.json'),drafts=read('content-briefs/exact-drafts.json'),source=d=>{const r=read(d.source);return r.data.service??r.data.doctor;};
const m=prepareBrazil(snapshot,drafts,source);
const keys={Country:'country',CountryLocale:'countryLocales',Service:'services',ServiceTranslation:'serviceTranslations',ServiceFaq:'serviceFaqs',ServiceFaqTranslation:'serviceFaqTranslations',ServiceDoctor:'assignments',Doctor:'doctors',DoctorCountry:'doctorCountries',DoctorTranslation:'doctorTranslations',DoctorMarketTranslation:'doctorMarketTranslations',DoctorFaq:'doctorFaqs',ServiceLink:'serviceLinks',ServiceLinkTranslation:'serviceLinkTranslations'};
function clientFor(data,failAt=Infinity){let state=structuredClone(data),backup,writes=0;return{get state(){return state;},get writes(){return writes;},async query(sql,v=[]){if(sql.startsWith('BEGIN')){backup=structuredClone(state);return{rows:[]};}if(sql==='ROLLBACK'){state=backup;return{rows:[]};}if(sql==='COMMIT')return{rows:[]};const table=sql.match(/(?:FROM|UPDATE) "(\w+)"/)?.[1];if(sql.startsWith('SELECT'))return{rows:structuredClone(table==='Country'?[state.country]:state[keys[table]])};if(++writes===failAt)throw new Error('Injected failure');const row=state[keys[table]].find(r=>r.id===v.at(-1));const columns=[...sql.matchAll(/"(\w+)"=\$\d+/g)].map(m=>m[1]);columns.forEach((k,i)=>row[k]=v[i]);return{rowCount:1,rows:[]};}};}
test('Brazil real source plan preserves PT FAQ base ownership and hidden records; refuses source drift',()=>{
 assert.equal(m.blockers.length,0);assert.equal(m.groups.length,19);let after=structuredClone(snapshot.data);for(const g of m.groups){after=rehearse(after,g);assert.deepEqual(rehearse(after,g),after);}
 assert.equal(after.serviceFaqs.length,snapshot.data.serviceFaqs.length);assert.equal(after.serviceFaqTranslations.length,300);assert(!after.serviceFaqTranslations.some(t=>t.locale==='PT'));assert.deepEqual(after.assignments,snapshot.data.assignments);
 const serviceDraft=drafts.find(d=>d.key.startsWith('service:'));const changed=structuredClone(snapshot);changed.data.serviceTranslations.find(t=>t.serviceId===serviceDraft.id&&t.locale===serviceDraft.locale.toUpperCase()).seoTitle='Concurrent edit';assert(prepareBrazil(changed,drafts,source).blockers.length);
 assert(prepareBrazil(snapshot,drafts,d=>({...source(d),seoTitle:'Public drift'})).blockers.length);
});
test('Brazil runner gates exact approval, repeats safely, refuses protected drift, rolls back failure',async()=>{
 const g=m.groups[0],client=clientFor(snapshot.data);await executeSpainGroup(client,snapshot.data,g);assert.equal(client.writes,0);await assert.rejects(executeSpainGroup(client,snapshot.data,g,{apply:true}),/Brazil clinical/);
 const approval={manifestSha256:hash(m),reviewerDoctorId:snapshot.data.doctors[0].id,reviewerName:'Synthetic test only',reviewedAt:new Date().toISOString(),evidence:'Synthetic test only',maxAgeDays:1,groups:[{key:g.key,approvedSha256:g.approvalSha256}]};assert.throws(()=>verifySpainApproval(m,approval,g));
 try{BRAZIL_REVIEW_POLICY.maxAgeDays=1;APPROVED_BRAZIL_STATES[g.stateKey]=[{stateSha256:g.resultingStateSha256,reviewerDoctorId:approval.reviewerDoctorId,reviewedAt:approval.reviewedAt,evidence:approval.evidence}];verifySpainApproval(m,approval,g);await executeSpainGroup(client,snapshot.data,g,{apply:true});const n=client.writes;assert((await executeSpainGroup(client,snapshot.data,g,{apply:true})).alreadyApplied);assert.equal(client.writes,n);
 const bad=structuredClone(snapshot.data);bad.services[0].basePriceCents++;await assert.rejects(executeSpainGroup(clientFor(bad),snapshot.data,g,{apply:true}),/Storage drift/);
 const failed=clientFor(snapshot.data,2);await assert.rejects(executeSpainGroup(failed,snapshot.data,g,{apply:true}),/Injected/);assert.deepEqual(failed.state,snapshot.data);
 for(const date of ['2099-01-01','2020-01-01']){APPROVED_BRAZIL_STATES[g.stateKey][0].reviewedAt=date;assert.throws(()=>assertBrazilClinicalChanges(snapshot.data,rehearse(snapshot.data,g)));}
 }finally{BRAZIL_REVIEW_POLICY.maxAgeDays=null;delete APPROVED_BRAZIL_STATES[g.stateKey];}
});
test('CMS mutation boundary refuses unreviewed Brazil change and preserves operational-only updates',async()=>{
 const c=clientFor(snapshot.data),client={$transaction:async work=>{await c.query('BEGIN');try{return await work({country:{findUnique:async({where})=>where.code==='br'?{id:snapshot.data.country.id}:null},$queryRawUnsafe:async(sql,...v)=>(await c.query(sql,v)).rows});}catch(e){await c.query('ROLLBACK');throw e;}}};
 await assert.rejects(reviewedRomaniaTransaction(client,async()=>{c.state.services[0].seoTitle='Unreviewed';}),/Brazil clinical/);assert.deepEqual(c.state,snapshot.data);
 const operational=structuredClone(snapshot.data);operational.services[0].basePriceCents++;assert.doesNotThrow(()=>assertBrazilClinicalChanges(snapshot.data,operational));
});

}
