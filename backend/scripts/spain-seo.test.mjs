import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSpain,planCopyPatches,planTextReplacements,hash,rehearse} from './prepare-spain-seo.mjs';
import {executeSpainGroup,verifySpainApproval,rolloutReceipt} from './apply-spain-seo.mjs';
import {APPROVED_SPAIN_STATES,SPAIN_REVIEW_POLICY,romanianContentStates,assertSpainClinicalChanges,reviewedRomaniaTransaction} from '../src/content/romania-clinical-review.ts';
import {verifyPage} from '../../seo/spain/verify-public.mjs';
function fixture(){
 const data={country:{id:'es-country',code:'es',slug:'spain',defaultLocale:'ES'},countryLocales:[{locale:'ES'},{locale:'EN'}],services:[{id:'svc',countryId:'es-country',slug:'test',isActive:true,visibility:'PUBLIC',seoTitle:'Old',basePriceCents:3900}],serviceTranslations:['ES','EN'].map(locale=>({id:`t-${locale}`,serviceId:'svc',locale,seoTitle:'Old'})),serviceFaqs:[],serviceFaqTranslations:[],assignments:[{id:'a',serviceId:'svc',doctorId:'doc',isActive:true,status:'active'}],doctors:[{id:'doc',countryId:'es-country',active:true,languages:['Spanish']}],doctorCountries:[{id:'market',doctorId:'doc',countryId:'es-country',active:true,isVerified:true}],doctorTranslations:[],doctorMarketTranslations:[],doctorFaqs:[],allDoctorAssignments:[],serviceLinks:[],serviceLinkTranslations:[]};
 data.allDoctorAssignments=structuredClone(data.assignments);
 const sources={};const drafts=['es','en'].map(locale=>{const source={resolvedLocale:locale.toUpperCase(),seoTitle:'Old',assignedDoctorIds:['doc']};sources[locale]=source;return{key:'service:test',id:'svc',slug:'test',url:`https://example.com/spain/${locale}/services/test`,locale,sourceFingerprint:hash(source),before:{seoTitle:'Old'},after:{seoTitle:'New'},faqPatches:[],addedFaqs:[{question:`Q ${locale}?`,answer:`A ${locale}.`}],hold:''};});
 return{data,drafts,sources};
}
const tableKeys={Country:'country',Service:'services',ServiceTranslation:'serviceTranslations',ServiceFaq:'serviceFaqs',ServiceFaqTranslation:'serviceFaqTranslations',ServiceDoctor:'assignments',Doctor:'doctors',DoctorCountry:'doctorCountries',DoctorTranslation:'doctorTranslations',DoctorMarketTranslation:'doctorMarketTranslations',DoctorFaq:'doctorFaqs',CountryLocale:'countryLocales',ServiceLink:'serviceLinks',ServiceLinkTranslation:'serviceLinkTranslations'};
test('public verifier checks exact copy, FAQ schema and obsolete links',()=>{
 const before={url:'https://example.com',canonical:'https://example.com',robots:'index',hreflang:[],title:'Old',description:'Description',h1:['Care'],faqs:[]};
 const draft={after:{seoTitle:'New'},addedFaqs:[{question:'Q?',answer:'A.'}]};
 const after={...before,title:'New',status:200,finalUrl:before.url,faqs:draft.addedFaqs,schemaFaqs:draft.addedFaqs,links:[],body:''};
 assert.doesNotThrow(()=>verifyPage(before,after,draft));
 assert.doesNotThrow(()=>verifyPage(before,{...after,title:'New · Global Health'},draft));
 assert.throws(()=>verifyPage(before,{...after,title:'Old'},draft),/Title mismatch/);
 assert.throws(()=>verifyPage(before,{...after,schemaFaqs:[]},draft),/schema/);
 assert.throws(()=>verifyPage(before,{...after,links:[{href:'/services/obsolete'}]},draft,[{targetSlug:'obsolete'}]),/Obsolete/);
 // Localized service: noindex/no alternates before, indexable with full alternates after.
 const urls=['https://e.com/spain/es/services/x','https://e.com/spain/en/services/x'];
 const hidden={...before,robots:'noindex, follow',hreflang:[]},shown={...after,robots:'index, follow',hreflang:[{lang:'es-ES',url:urls[0]},{lang:'en-ES',url:urls[1]},{lang:'x-default',url:urls[0]}]};
 assert.doesNotThrow(()=>verifyPage(hidden,shown,draft,[],{localizedUrls:urls}));
 assert.throws(()=>verifyPage(hidden,{...shown,robots:'noindex, follow'},draft,[],{localizedUrls:urls}),/indexable/);
 assert.throws(()=>verifyPage(hidden,shown,draft),/Robots changed/);
});
function clientFor(initial,failAt=Infinity){let state=structuredClone(initial),backup,writes=0;return{get state(){return state;},get writes(){return writes;},async query(sql,values=[]){
 if(sql.startsWith('BEGIN')){backup=structuredClone(state);return{rows:[]};}if(sql==='ROLLBACK'){state=backup;return{rows:[]};}if(sql==='COMMIT')return{rows:[]};
 const table=sql.match(/(?:FROM|UPDATE|INTO) "(\w+)"/)?.[1],key=tableKeys[table];
 if(sql.startsWith('SELECT'))return{rows:structuredClone(table==='Country'?[state.country]:state[key])};
 writes++;if(writes===failAt)throw new Error('Injected SQL failure');
 if(sql.startsWith('UPDATE')){const columns=[...sql.matchAll(/"(\w+)"=\$\d+/g)].map(m=>m[1]);const row=state[key].find(r=>r.id===values.at(-1));for(const[i,k]of columns.entries())row[k]=values[i];}
 else {const cols=sql.slice(sql.indexOf('(')+1,sql.indexOf(')')).split(',').map(s=>s.replaceAll('"','').trim()).filter(k=>!['createdAt','updatedAt'].includes(k));state[key].push(Object.fromEntries(cols.map((k,i)=>[k,values[i]])));}
 return{rowCount:1,rows:[]};
 }};}
test('Spain planner preserves hidden/unrelated data, exact locales and hashes; refuses drift and missing translation',()=>{
 const f=fixture();f.data.doctorFaqs.push({id:'hidden',doctorId:'doc',locale:'DE',answer:'Retain',question:'Q',isActive:false});
 const m=prepareSpain({data:f.data},f.drafts,[],d=>f.sources[d.locale]);assert.equal(m.blockers.length,0);assert.equal(m.groups.length,1);
 const after=rehearse(f.data,m.groups[0]);assert.deepEqual(after.doctorFaqs,f.data.doctorFaqs);assert.equal(after.services[0].basePriceCents,3900);assert.equal(after.serviceFaqs.length,1);assert.deepEqual(after.serviceFaqTranslations.map(t=>t.locale),['EN']);assert.deepEqual(rehearse(after,m.groups[0]),after);
 for(const change of [x=>x.serviceTranslations.pop(),x=>x.serviceTranslations[0].seoTitle='Drift',x=>x.serviceFaqs.push({id:'hidden',serviceId:'svc',isVisible:false})]){const data=structuredClone(f.data);change(data);assert.equal(prepareSpain({data},f.drafts,[],d=>f.sources[d.locale]).groups.length,0);}
 // Null translation field falls back to the base value; default-locale FAQ patches target the base row only.
 const fallback=structuredClone(f.data);fallback.serviceTranslations[1].seoTitle=null;fallback.serviceFaqs.push({id:'faq',serviceId:'svc',question:'Q',answer:'Old',isVisible:true});fallback.serviceFaqTranslations.push({id:'faq-EN',serviceFaqId:'faq',locale:'EN',question:'Q',answer:'Old'});
 const patched=structuredClone(f.drafts).map(d=>({...d,addedFaqs:[],faqPatches:[{id:'faq',before:{answer:'Old'},after:{answer:`New ${d.locale}`}}]}));
 const fm=prepareSpain({data:fallback},patched,[],d=>f.sources[d.locale]);assert.equal(fm.blockers.length,0,JSON.stringify(fm.blockers));
 const fa=rehearse(fallback,fm.groups[0]);assert.equal(fa.serviceTranslations[1].seoTitle,'New');assert.equal(fa.serviceFaqs[0].answer,'New es');assert.equal(fa.serviceFaqTranslations[0].answer,'New en');assert.equal(fa.serviceFaqTranslations.length,1);
 const noEn=structuredClone(fallback);noEn.serviceFaqTranslations=[];assert.match(prepareSpain({data:noEn},patched,[],d=>f.sources[d.locale]).blockers[0].reason,/Missing FAQ translation/);
 const changed=structuredClone(f.drafts);changed[0].after.seoTitle='Other';assert.notEqual(prepareSpain({data:f.data},changed,[],d=>f.sources[d.locale]).groups[0].approvalSha256,m.groups[0].approvalSha256);
});
test('copy patches write summary/name per locale from storage and refuse drift',()=>{
 const f=fixture(),data=structuredClone(f.data);data.services[0].name='Old';data.serviceTranslations.forEach(t=>t.name=null);
 const patches={test:{ES:{summary:'Resumen.',name:'Nuevo',currentName:'Old'},EN:{summary:'Summary.'}}};
 const m=planCopyPatches({data},patches);assert.equal(m.blockers.length,0,JSON.stringify(m.blockers));
 const after=rehearse(data,m.groups[0]);assert.equal(after.services[0].summary,'Resumen.');assert.equal(after.services[0].name,'Nuevo');
 assert.equal(after.serviceTranslations.find(t=>t.locale==='EN').summary,'Summary.');assert.equal(after.services[0].basePriceCents,3900);
 assert.match(planCopyPatches({data},{test:{ES:{summary:'x',name:'N',currentName:'Wrong'},EN:{summary:'y'}}}).blockers[0].reason,/Name drift/);
 assert.match(planCopyPatches({data},{test:{ES:{summary:'x'}}}).blockers[0].reason,/Every market locale/);
 assert.match(planCopyPatches({data},{test:{ES:{summary:'x'.repeat(161)},EN:{summary:'y'}}}).blockers[0].reason,/160/);
});
test('registration typo correction rewrites only doctor-owned text and refuses leftovers',async()=>{
 const f=fixture(),data=structuredClone(f.data);
 Object.assign(data.doctors[0],{slug:'doc-slug',seoTitle:'Psicólogo nº MUO1',seoDescription:null,qualifications:['PGS — nº MUO1','Máster']});
 data.doctorCountries[0].registrationNumber='MUO1';
 data.doctorFaqs.push({id:'dfaq',doctorId:'doc',locale:'ES',question:'¿Colegiado?',answer:'Sí, nº MUO1.'});
 const c={doctorSlug:'doc-slug',from:'MUO1',to:'MU01',evidence:'registry.json',urls:['https://e.com/x']};
 const m=prepareSpain({data},[],[],()=>null,{keys:[],corrections:[c]});assert.equal(m.blockers.length,0,JSON.stringify(m.blockers));
 const g=m.groups[0];assert.deepEqual(g.changes.map(x=>x.table).sort(),['doctorCountries','doctorFaqs','doctors']);
 const after=rehearse(data,g);assert.equal(after.doctorCountries[0].registrationNumber,'MU01');assert.deepEqual(after.doctors[0].qualifications,['PGS — nº MU01','Máster']);assert.equal(after.doctors[0].seoTitle,'Psicólogo nº MU01');
 assert.equal(after.doctorCountries[0].chamberEntity,data.doctorCountries[0].chamberEntity);assert.equal(after.doctorCountries[0].isVerified,true);
 const client=clientFor(data);await executeSpainGroup(client,data,g);assert.equal(client.writes,0);
 const stuck=structuredClone(data);stuck.doctorTranslations.push({id:'dt',doctorId:'doc',locale:'EN',bio:'No. MUO1'});
 assert.match(prepareSpain({data:stuck},[],[],()=>null,{keys:[],corrections:[c]}).blockers[0].reason,/Typo remains/);
});
test('Spain gate refuses absent, future and expired reviews; validates reviewer; allows operational-only changes',()=>{
 const f=fixture(),after=structuredClone(f.data);after.services[0].seoTitle='New';const key='service:svc',now=Date.parse('2026-09-13');
 assert.throws(()=>assertSpainClinicalChanges(f.data,after,now),/requires approval/);
 try{SPAIN_REVIEW_POLICY.maxAgeDays=30;APPROVED_SPAIN_STATES[key]=[{stateSha256:romanianContentStates(after)[key],reviewerDoctorId:'doc',reviewedAt:'2026-09-12',evidence:'Synthetic test only'}];assert.doesNotThrow(()=>assertSpainClinicalChanges(f.data,after,now));
 APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-09-14';assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-07-01';assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));
 APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-09-12';after.doctorCountries[0].active=false;assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));
 }finally{SPAIN_REVIEW_POLICY.maxAgeDays=365;delete APPROVED_SPAIN_STATES[key];}
 const operational=structuredClone(f.data);operational.services[0].basePriceCents=1;assert.doesNotThrow(()=>assertSpainClinicalChanges(f.data,operational));
});
test('runner dry-run, approved writes, repeat, drift refusal and rollback after injected failure',async()=>{
 const f=fixture(),m=prepareSpain({data:f.data},f.drafts,[],d=>f.sources[d.locale]),g=m.groups[0],client=clientFor(f.data);
 await executeSpainGroup(client,f.data,g);assert.equal(client.writes,0);
 await assert.rejects(executeSpainGroup(client,f.data,g,{apply:true}),/requires approval/);assert.equal(client.writes,0);
 const approval={manifestSha256:hash(m),reviewerDoctorId:'doc',reviewerName:'Synthetic reviewer',evidence:'test only',reviewedAt:new Date().toISOString(),maxAgeDays:1,groups:[{key:g.key,approvedSha256:g.approvalSha256}]};assert.throws(()=>verifySpainApproval(m,approval,g));assert.throws(()=>verifySpainApproval({...m,country:'changed'},approval,g),/manifest changed/);
 try{SPAIN_REVIEW_POLICY.maxAgeDays=1;APPROVED_SPAIN_STATES[g.stateKey]=[{stateSha256:g.resultingStateSha256,reviewerDoctorId:'doc',reviewedAt:approval.reviewedAt,evidence:approval.evidence}];
 verifySpainApproval(m,approval,g);assert.throws(()=>verifySpainApproval(m,{...approval,reviewerDoctorId:'other'},g),/server approval differ/);
 await executeSpainGroup(client,f.data,g,{apply:true});const writes=client.writes;assert((await executeSpainGroup(client,f.data,g,{apply:true})).alreadyApplied);assert.equal(client.writes,writes);
 const bad=structuredClone(f.data);bad.services[0].basePriceCents=123;const drift=clientFor(bad);await assert.rejects(executeSpainGroup(drift,f.data,g,{apply:true}),/Storage drift/);assert.equal(drift.writes,0);
 const failure=clientFor(f.data,2);await assert.rejects(executeSpainGroup(failure,f.data,g,{apply:true}),/Injected SQL failure/);assert.deepEqual(failure.state,f.data);
 }finally{SPAIN_REVIEW_POLICY.maxAgeDays=365;delete APPROVED_SPAIN_STATES[g.stateKey];}
});
test('verified receipt survives safe repeat; conflicting receipt is refused',()=>{
 const previous={approvalSha256:'a',afterSha256:'b',publicVerified:true,checkedAt:'publication'};
 const repeat={approvalSha256:'a',afterSha256:'b',alreadyApplied:true,publicVerified:false,checkedAt:'repeat'};
 assert.deepEqual(rolloutReceipt(previous,repeat),{...previous,lastRepeatCheckedAt:'repeat'});
 assert.throws(()=>rolloutReceipt(previous,{...repeat,afterSha256:'drift'}));
});
test('existing CMS transaction owner protects Spain even without Romania',async()=>{
 const f=fixture();let committed=false;const client=clientFor(f.data);
 const prisma={$transaction:async work=>{await client.query('BEGIN');try{const out=await work({country:{findUnique:async({where})=>where.code==='es'?{id:'es-country'}:null},$queryRawUnsafe:async(sql,...values)=>(await client.query(sql,values)).rows});committed=true;return out;}catch(e){await client.query('ROLLBACK');throw e;}}};
 await assert.rejects(reviewedRomaniaTransaction(prisma,async()=>{client.state.services[0].seoTitle='Unreviewed';}),/Spain clinical/);assert.equal(committed,false);assert.deepEqual(client.state,f.data);
});
test('text replacements: exact single match, Spain-only owners, array compare-and-set',()=>{
 const f=fixture();
 f.data.services[0].detailBody='<li>Bajas médicas</li><p>Otro</p>';f.data.services[0].seoKeywords=['a','baja'];
 f.data.doctorTranslations.push({id:'dt',doctorId:'doc',locale:'ES',bio:'<li>Bajas médicas</li>'});
 const reps=[{table:'services',id:'svc',field:'detailBody',from:'<li>Bajas médicas</li>',to:'<li>Justificantes</li>'},{table:'services',id:'svc',field:'seoKeywords',from:['a','baja'],to:['a']},{table:'doctorTranslations',id:'dt',field:'bio',from:'Bajas médicas',to:'Justificantes'}];
 const m=planTextReplacements({data:f.data},reps);
 assert.deepEqual(m.blockers,[]);assert.deepEqual(m.groups.map(g=>g.key),['text:service:svc','text:doctor:doc']);
 const next=m.groups.reduce((s,g)=>rehearse(s,g),f.data);
 assert.equal(next.services[0].detailBody,'<li>Justificantes</li><p>Otro</p>');assert.deepEqual(next.services[0].seoKeywords,['a']);assert.equal(next.doctorTranslations[0].bio,'<li>Justificantes</li>');
 assert.match(planTextReplacements({data:f.data},[{...reps[0],from:'<p>Missing</p>'}]).blockers[0].reason,/exactly once/);
 assert.match(planTextReplacements({data:f.data},[{...reps[1],from:['drift']}]).blockers[0].reason,/Array drift/);
 const foreign=structuredClone(f.data);foreign.doctorCountries.push({id:'m2',doctorId:'doc',countryId:'pt-country'});
 assert.match(planTextReplacements({data:foreign},[reps[2]]).blockers[0].reason,/cross-market/);
 const other=structuredClone(f.data);other.services[0].countryId='pt-country';
 assert.match(planTextReplacements({data:other},[reps[0]]).blockers[0].reason,/another market/);
});
