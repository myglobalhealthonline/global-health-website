import fs from 'node:fs';
import assert from 'node:assert/strict';
import {hash,rehearse} from './prepare-romania-seo.mjs';
import {romanianContentStates} from '../src/content/romania-clinical-review.ts';
export {hash,rehearse};
const one=(rows,fn,message)=>{const found=rows.filter(fn);assert.equal(found.length,1,message);return found[0];};
export function prepareSpain(snapshot,drafts,links,sourceFor){
 const s=snapshot.data;assert.equal(s.country.code,'es');assert.equal(s.country.defaultLocale,'ES');
 const groups=[],blockers=[];let state=structuredClone(s);
 // Manifest order: each service followed by its assigned doctors' profiles, remaining profiles, then link removals.
 const draftKeys=[...new Set(drafts.map(d=>d.key))],ordered=[];
 for(const key of draftKeys.filter(k=>k.startsWith('service:')&&!drafts.some(d=>d.key===k&&d.hold))){const svc=s.services.find(x=>`service:${x.slug}`===key);ordered.push(key,...s.assignments.filter(a=>a.serviceId===svc?.id&&a.isActive).map(a=>`doctor:${s.doctors.find(d=>d.id===a.doctorId)?.slug}`));}
 for(const key of [...new Set([...ordered.filter(k=>draftKeys.includes(k)),...draftKeys,...links.map(l=>l.key)])]){
  try{
   const batch=drafts.filter(d=>d.key===key),link=links.find(l=>l.key===key),changes=[];
   assert(!batch.some(d=>d.hold),batch.find(d=>d.hold)?.hold);
   const update=(table,row,after)=>{for(const field of Object.keys(after))assert(field in row,`Missing stored column ${field}`);const changed=Object.fromEntries(Object.entries(after).filter(([k,v])=>row[k]!==v));if(Object.keys(changed).length)changes.push({action:'update',table,id:row.id,before:structuredClone(row),after:changed});};
   const insert=(table,after)=>{assert(!state[table].some(r=>r.id===after.id),'Existing proposed ID');changes.push({action:'insert',table,id:after.id,after});};
   let stateKey;
   if(link){const row=one(state.serviceLinks,r=>r.id===link.id,'Missing service link');assert.equal(row.sourceServiceId,link.sourceServiceId);assert.equal(row.isActive,true,'Link drift');const target=state.services.find(s=>s.id===row.targetServiceId);assert(target?.slug===link.targetSlug||row.targetHref?.includes(link.targetSlug),'Link target drift');update('serviceLinks',row,{isActive:false});stateKey=`service:${row.sourceServiceId}`;}
   for(const d of batch){
    const source=sourceFor(d);assert.equal(hash(source),d.sourceFingerprint,'Public snapshot fingerprint drift');
    for(const [k,v] of Object.entries(d.before))assert.equal(source[k],v,`Draft before drift ${k}`);
    const locale=d.locale.toUpperCase();
    assert.equal(source.resolvedLocale,locale,'Fallback requires separate owner reconciliation');
    if(key.startsWith('service:')){
     const base=one(state.services,r=>r.id===d.id&&r.slug===d.slug,'Service missing');assert(base.isActive&&base.visibility==='PUBLIC','Service publication drift');
     const assignments=state.assignments.filter(a=>a.serviceId===base.id&&a.isActive&&a.status==='active');assert(assignments.length,'No active service assignment');
     assert.deepEqual(assignments.map(a=>a.doctorId).sort(),[...source.assignedDoctorIds].sort(),'Assignment drift');
     const row=one(state.serviceTranslations,r=>r.serviceId===base.id&&r.locale===locale,'Missing service translation');
     // A null translation field renders the base (ES) value; the public "before" is that fallback.
     for(const [k,v] of Object.entries(d.before))assert.equal(row[k]??base[k],v,`Stored translation drift ${key}/${locale}/${k}`);
     update('serviceTranslations',row,d.after);
     if(locale==='ES'){for(const [k,v]of Object.entries(d.before))assert.equal(base[k],v,'Base copy drift');update('services',base,d.after);}
     for(const patch of d.faqPatches){
      const faq=one(state.serviceFaqs,f=>f.id===patch.id&&f.serviceId===base.id,'Missing native FAQ');
      // The default locale lives on the base FAQ row; only other locales need a translation row.
      const translations=state.serviceFaqTranslations.filter(t=>t.serviceFaqId===faq.id&&t.locale===locale);
      assert(translations.length||locale===state.country.defaultLocale,'Missing FAQ translation; reconcile fallback explicitly');
      for(const translation of translations){for(const [k,v]of Object.entries(patch.before))assert.equal(translation[k],v,'FAQ translation drift');update('serviceFaqTranslations',translation,patch.after);}
      if(locale==='ES'){for(const [k,v]of Object.entries(patch.before))assert.equal(faq[k],v,'Base FAQ drift');update('serviceFaqs',faq,patch.after);}
     }
     if(d.addedFaqs.length){
      assert(!state.serviceFaqs.some(f=>f.serviceId===base.id),'Existing or hidden FAQ requires reconciliation');
      const siblings=batch.filter(x=>x.addedFaqs.length);assert.deepEqual(siblings.map(x=>x.locale.toUpperCase()).sort(),state.countryLocales.map(x=>x.locale).sort(),'Missing FAQ locale');
      assert(siblings.every(x=>x.addedFaqs.length===d.addedFaqs.length),'FAQ translation count mismatch');
      for(const [i,faq]of d.addedFaqs.entries()){
       const id=`spain-seo-${hash([base.id,i]).slice(0,24)}`;
       if(locale==='ES')insert('serviceFaqs',{id,serviceId:base.id,...faq,sortOrder:i,isVisible:true});
       // Stored corpus keeps ES only on the base row; an ES translation row would shadow later base edits.
       if(locale!==state.country.defaultLocale)insert('serviceFaqTranslations',{id:`${id}-${locale}`,serviceFaqId:id,locale,...faq});
      }
     }
     stateKey=`service:${base.id}`;
    }else{
     const doctor=one(state.doctors,r=>r.id===d.id,'Missing doctor');
     assert.equal(doctor.countryId,state.country.id,'Doctor base belongs to another market');
     assert(state.allDoctorAssignments.filter(a=>a.doctorId===d.id).every(a=>state.services.some(s=>s.id===a.serviceId)),'Doctor assigned outside Spain; cross-market review required');
     const markets=state.doctorCountries.filter(m=>m.doctorId===d.id);assert(markets.every(m=>m.countryId===state.country.id),'Shared doctor requires cross-market review');
     assert.deepEqual(doctor.languages,source.languages,'Consultation-language drift');
     assert.equal(doctor.active,source.active,'Doctor activation drift');
     const market=one(markets,m=>m.countryId===state.country.id,'Spain market missing');
     if(Object.keys(d.after).length){const row=one(state.doctorMarketTranslations,r=>r.doctorCountryId===market.id&&r.locale===locale,'Market translation missing');for(const [k,v]of Object.entries(d.before))assert.equal(row[k],v,'Doctor override drift');update('doctorMarketTranslations',row,d.after);}
     for(const patch of d.faqPatches){const row=one(state.doctorFaqs,r=>r.id===patch.id&&r.doctorId===d.id&&r.locale===locale,'Doctor FAQ missing');for(const[k,v]of Object.entries(patch.before))assert.equal(row[k],v,'Doctor FAQ drift');update('doctorFaqs',row,patch.after);}
     stateKey=`doctor:${d.id}`;
    }
   }
   // Base FAQ rows must precede their translations in the same transaction.
   changes.sort((a,b)=>(a.action==='insert'&&a.table==='serviceFaqs'?-1:0)-(b.action==='insert'&&b.table==='serviceFaqs'?-1:0));
   assert(changes.length,'No changes');
   const group={key,stateKey,urls:link?.urls??batch.map(d=>d.url),changes};
   const next=rehearse(state,group);group.resultingStateSha256=romanianContentStates(next)[stateKey];group.approvalSha256=hash(group);groups.push(group);state=next;
  }catch(e){blockers.push({key,reason:e.message.split('\n')[0]});}
 }
 return {status:'storage prepared; no approval or publication',country:'es',snapshotSha256:hash(s),draftsSha256:hash(drafts),groups,blockers};
}
if(process.argv[1]?.endsWith('prepare-spain-seo.mjs')){
 const root='seo/spain',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`));const drafts=read('content-briefs/exact-drafts.json'),links=read('content-briefs/link-drafts.json');
 let manifest;
 if(!fs.existsSync(`${root}/raw/storage-preflight-2026-09-13.json`))manifest={status:'awaiting authenticated storage; public drafts only',country:'es',draftsSha256:hash(drafts),groups:[],proposedGroups:[...new Set(drafts.map(d=>d.key)),...links.map(l=>l.key)],blockers:[{key:'storage',reason:'Automatic approval review rejected content snapshot; explicit user confirmation pending.'}]};
 else manifest=prepareSpain(read('raw/storage-preflight-2026-09-13.json'),drafts,links,d=>{const r=read(d.source);return r.data.service??r.data.doctor;});
 fs.writeFileSync(`${root}/content-briefs/storage-mutation-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({status:manifest.status,groups:manifest.groups.length,blockers:manifest.blockers,manifestSha256:hash(manifest)}));
}
