import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSpain,hash,rehearse} from './prepare-spain-seo.mjs';
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
 assert.throws(()=>verifyPage(before,{...after,schemaFaqs:[]},draft),/schema/);
 assert.throws(()=>verifyPage(before,{...after,links:[{href:'/services/obsolete'}]},draft,[{targetSlug:'obsolete'}]),/Obsolete/);
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
 const after=rehearse(f.data,m.groups[0]);assert.deepEqual(after.doctorFaqs,f.data.doctorFaqs);assert.equal(after.services[0].basePriceCents,3900);assert.equal(after.serviceFaqs.length,1);assert.equal(after.serviceFaqTranslations.length,2);assert.deepEqual(rehearse(after,m.groups[0]),after);
 for(const change of [x=>x.serviceTranslations.pop(),x=>x.serviceTranslations[0].seoTitle='Drift',x=>x.serviceFaqs.push({id:'hidden',serviceId:'svc',isVisible:false})]){const data=structuredClone(f.data);change(data);assert.equal(prepareSpain({data},f.drafts,[],d=>f.sources[d.locale]).groups.length,0);}
 const changed=structuredClone(f.drafts);changed[0].after.seoTitle='Other';assert.notEqual(prepareSpain({data:f.data},changed,[],d=>f.sources[d.locale]).groups[0].approvalSha256,m.groups[0].approvalSha256);
});
test('Spain gate refuses absent, future and expired reviews; validates reviewer; allows operational-only changes',()=>{
 const f=fixture(),after=structuredClone(f.data);after.services[0].seoTitle='New';const key='service:svc',now=Date.parse('2026-09-13');
 assert.throws(()=>assertSpainClinicalChanges(f.data,after,now),/requires approval/);
 try{SPAIN_REVIEW_POLICY.maxAgeDays=30;APPROVED_SPAIN_STATES[key]=[{stateSha256:romanianContentStates(after)[key],reviewerDoctorId:'doc',reviewedAt:'2026-09-12',evidence:'Synthetic test only'}];assert.doesNotThrow(()=>assertSpainClinicalChanges(f.data,after,now));
 APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-09-14';assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-07-01';assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));
 APPROVED_SPAIN_STATES[key][0].reviewedAt='2026-09-12';after.doctorCountries[0].active=false;assert.throws(()=>assertSpainClinicalChanges(f.data,after,now));
 }finally{SPAIN_REVIEW_POLICY.maxAgeDays=null;delete APPROVED_SPAIN_STATES[key];}
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
 }finally{SPAIN_REVIEW_POLICY.maxAgeDays=null;delete APPROVED_SPAIN_STATES[g.stateKey];}
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
