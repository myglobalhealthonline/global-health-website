import fs from 'node:fs';
import assert from 'node:assert/strict';
import {hash,rehearse} from './prepare-romania-seo.mjs';
import {romanianContentStates} from '../src/content/romania-clinical-review.ts';
export {hash,rehearse};
export function prepareBrazil(snapshot,drafts,sourceFor){
 const s=snapshot.data;assert.equal(s.country.code,'br');assert.equal(s.country.defaultLocale,'PT');
 const groups=[],blockers=[];let state=structuredClone(s);
 const one=(rows,fn)=>{const found=rows.filter(fn);assert.equal(found.length,1,'Ambiguous/missing stored row');return found[0];};
 for(const key of [...new Set(drafts.map(d=>d.key))]){try{
  const batch=drafts.filter(d=>d.key===key),changes=[];let stateKey;
  const update=(table,row,before,after)=>{for(const[k,v]of Object.entries(before))assert.deepEqual(row[k],v,`Stored source drift ${key}/${table}/${k}`);const fields=Object.fromEntries(Object.entries(after).filter(([k,v])=>row[k]!==v));if(Object.keys(fields).length)changes.push({action:'update',table,id:row.id,before:structuredClone(row),after:fields});};
  for(const d of batch){
   assert(!d.hold,d.hold);const source=sourceFor(d);assert.equal(hash(source),d.sourceFingerprint,'Public fingerprint drift');assert.equal(source.resolvedLocale,d.locale.toUpperCase(),'Fallback requires reconciliation');
   for(const[k,v]of Object.entries(d.before))assert.deepEqual(source[k],v,'Public before drift');
   const locale=d.locale.toUpperCase();assert.equal(d.addedFaqs.length,0,'Brazil already has native FAQs; additions require separate reconciliation');
   if(key.startsWith('service:')){
    const base=one(state.services,r=>r.id===d.id&&r.slug===d.slug);assert(base.isActive&&base.visibility==='PUBLIC','Publication drift');
    const assignments=state.assignments.filter(a=>a.serviceId===base.id&&a.isActive&&a.status==='active');assert(assignments.length,'No active assignment');assert.deepEqual(assignments.map(a=>a.doctorId).sort(),[...source.assignedDoctorIds].sort(),'Assignment drift');
    const row=one(state.serviceTranslations,r=>r.serviceId===d.id&&r.locale===locale);update('serviceTranslations',row,d.before,d.after);
    if(locale==='PT')update('services',base,d.before,d.after);
    for(const patch of d.faqPatches){const faq=one(state.serviceFaqs,f=>f.id===patch.id&&f.serviceId===d.id);assert(faq.isVisible,'Hidden FAQ requires reconciliation');
     const translations=state.serviceFaqTranslations.filter(t=>t.serviceFaqId===faq.id&&t.locale===locale);
     if(locale==='PT'){assert.equal(translations.length,0,'PT FAQ override appeared; reconcile');update('serviceFaqs',faq,patch.before,patch.after);}
     else update('serviceFaqTranslations',one(translations,()=>true),patch.before,patch.after);
    }
    stateKey=`service:${d.id}`;
   }else{
    const doc=one(state.doctors,r=>r.id===d.id);assert.equal(doc.countryId,state.country.id,'Shared base requires review');assert.deepEqual(doc.languages,source.languages,'Language drift');assert(doc.active,'Inactive doctor');
    const markets=state.doctorCountries.filter(m=>m.doctorId===d.id);assert(markets.every(m=>m.countryId===state.country.id),'Shared FAQ requires cross-country review');assert(state.allDoctorAssignments.filter(a=>a.doctorId===d.id).every(a=>state.services.some(s=>s.id===a.serviceId)),'Outside-market assignment');
    const market=one(markets,()=>true);const row=one(state.doctorMarketTranslations,r=>r.doctorCountryId===market.id&&r.locale===locale);update('doctorMarketTranslations',row,d.before,d.after);
    for(const patch of d.faqPatches)update('doctorFaqs',one(state.doctorFaqs,r=>r.id===patch.id&&r.doctorId===d.id&&r.locale===locale),patch.before,patch.after);
    stateKey=`doctor:${d.id}`;
   }
  }
  assert(changes.length);const group={key,stateKey,urls:batch.map(d=>d.url),changes};const after=rehearse(state,group);group.resultingStateSha256=romanianContentStates(after)[stateKey];group.approvalSha256=hash(group);groups.push(group);state=after;
 }catch(e){blockers.push({key,reason:e.message.split('\n')[0]});}}
 return{status:'storage prepared; no approval or publication',country:'br',snapshotSha256:hash(s),draftsSha256:hash(drafts),groups,blockers};
}
if(process.argv[1]?.endsWith('prepare-brazil-seo.mjs')){const root='seo/brazil',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`));const drafts=read('content-briefs/exact-drafts.json');
 // Phase N>1: the same reviewed drafts re-planned against a later snapshot and refreshed public sources.
 // Draft text is unchanged; only source fingerprints are re-bound, and every `before` value is still asserted.
 const phase=Number(process.argv.find(a=>a.startsWith('--phase='))?.slice(8)??1),plan=phase>1?read(`content-briefs/phase${phase}-plan.json`):null;
 const source=d=>{const r=read(plan?`${plan.sources}/${d.source.split('/').pop()}`:d.source);return r.data.service??r.data.doctor;};
 const planned=plan?drafts.map(d=>({...d,sourceFingerprint:hash(source(d))})):drafts;
 let m=prepareBrazil(read(plan?plan.snapshot:'raw/storage-preflight-2026-09-13.json'),planned,source);
 if(plan)m={...m,draftsSha256:hash(drafts),phase,sources:plan.sources};
 fs.writeFileSync(`${root}/content-briefs/storage-mutation-manifest${plan?`-phase${phase}`:''}.json`,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({groups:m.groups.length,operations:m.groups.reduce((n,g)=>n+g.changes.length,0),blockers:m.blockers,sha256:hash(m)}));}
