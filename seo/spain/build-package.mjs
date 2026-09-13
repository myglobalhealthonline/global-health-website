// Offline derivation from saved Spain evidence. No network or production mutations.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {languageNames,booking,missingFaqs,dermAnswers,newFaqCopy,gpCopy} from './content-briefs/copy.mjs';
const require=createRequire(import.meta.url), htmlRequire=createRequire(require.resolve('../../backend/node_modules/sanitize-html'));
const {parseDocument,DomUtils}=htmlRequire('htmlparser2');
const root='seo/spain', read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const write=(p,v)=>fs.writeFileSync(`${root}/${p}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const csv=(p,rows)=>{assert(rows.length);const keys=[...new Set(rows.flatMap(Object.keys))],cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';write(p,[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\n')+'\n');};
const plain=v=>DomUtils.textContent(parseDocument(v??'')).replace(/\s+/g,' ').trim();
const pages=read('raw/public-inventory-2026-09-13.json'),roster=read('raw/api/doctors-ES.json').data,registry=read('raw/registry-checks-2026-09-13.json');
const type=p=>{const a=new URL(p.url).pathname.split('/');return a[3]==='services'?'service':a[3]==='doctors'&&a[4]?'doctor':a[3]==='blog'&&a[4]?'article':a[3]==='tools'?'tool':a[3]??'home';};
const getSource=p=>{const a=new URL(p.url).pathname.split('/');const source=`raw/api/${a[3]}-${a[4]}-${a[2].toUpperCase()}.json`;return {source,...read(source)};};
const gsc={};for(const period of ['current','previous']){const r=read(`raw/gsc-pages-${period}-2026-09-13.json`);assert.equal(r.hasMore,false);gsc[period]=r.rows;}
const queries=read('raw/gsc-query-page-current-2026-09-13.json');assert.equal(queries.hasMore,false);
const coverage=[],supply=[],drafts=[],linkDrafts=new Map();
const timeSuffix=/\s*\|\s*(?:Mismo Día|Same Day|Stejný den|Am selben Tag|Mesmo Dia|În aceeași zi)$/i;
for(const p of pages.filter(p=>p.status===200&&['service','doctor'].includes(type(p)))){
 const response=getSource(p),s=response.data?.service??response.data?.doctor;assert(s,`Missing API ${p.url}`);
 const native=s.faqs??[],doc=parseDocument(s.detailBody??s.bio??'');
 const headings=DomUtils.findAll(n=>/^h[2-3]$/.test(n.name??''),doc.children);
 const faqHeads=headings.filter(n=>/^(preguntas frecuentes|frequently asked questions|často kladené otázky|häufig gestellte fragen|perguntas frequentes|întrebări frecvente)$/i.test(plain(DomUtils.getOuterHTML(n))));
 const embedded=[];
 for(const h of faqHeads){let n=h.next;while(n&&!/^h[12]$/.test(n.name??'')){if(n.type==='tag'&&plain(DomUtils.getOuterHTML(n)).includes('?'))embedded.push(plain(DomUtils.getOuterHTML(n)));n=n.next;}}
 const normalized=faqs=>faqs.map(f=>({question:plain(f.question),answer:plain(f.answer)}));
 coverage.push({url:p.url,locale:p.locale,resolved_locale:s.resolvedLocale,native_api:native.length,native_html:p.faqs.length,schema:p.schemaFaqCount,embedded:embedded.length,embedded_questions:embedded.join(' | '),equivalent:JSON.stringify(normalized(p.faqs))===JSON.stringify(normalized(p.schemaFaqs)),source:response.source});
 assert.equal(native.length,p.faqs.length,`Native FAQ mismatch ${p.url}`);
 const before={},after={},faqPatches=[];
 let addedFaqs=[],reasons=[];
 if(type(p)==='service'){
  const doctors=roster.filter(d=>s.assignedDoctorIds.includes(d.id));
  supply.push({url:p.url,locale:p.locale,resolved_locale:s.resolvedLocale,kind:s.kind,service:s.slug,bookability:s.bookability.state,reason:s.bookability.reasonCode,next_available_at:s.bookability.nextAvailableAt,doctors:doctors.map(d=>d.fullName).join(' | '),consultation_languages:doctors.map(d=>`${d.fullName}: ${d.languages.join(', ')}`).join(' | '),price_cents:s.basePriceCents,duration:s.durationMinutes,registry_issue:doctors.some(d=>d.slug==='dr-luz-marina-zuluaga-rios')?'Luz: CGCOM alta sin ejercicio; operations clarification required':'',source:response.source});
  if(s.resolvedLocale===p.locale.toUpperCase()){
   if(s.slug==='consulta-medica-online') {const [label,description]=gpCopy[p.locale];for(const [k,v] of Object.entries({seoTitle:label+' | Global Health',seoDescription:description,heroTitle:label})){before[k]=s[k];after[k]=v;}reasons.push('Clarify general-care owner and remove unsupported immediate appointment/document promises; preserve all eight native FAQs.');}
   const title=s.seoTitle?.replace(timeSuffix,'');if(title!==s.seoTitle&&!after.seoTitle){before.seoTitle=s.seoTitle;after.seoTitle=title;reasons.push('Remove unconditional same-day title; availability is dynamic.');}
   if(missingFaqs[s.slug]){
    assert.equal(native.length,0);assert.equal(embedded.length,0);
    const actualLanguages=[...new Set(doctors.flatMap(d=>d.languages))].map(l=>languageNames[p.locale][languageNames.en.indexOf(l)]).join(', ');
    addedFaqs=(p.locale==='es'?missingFaqs[s.slug]:newFaqCopy[p.locale].filter((_,i)=>s.slug!=='consulta-salud-vascular-circulatoria'||i!==1).map(([q,a],i,arr)=>[q,i===arr.length-1?a+actualLanguages+'.':a])).map(([question,answer])=>({question,answer}));reasons.push('No native or embedded FAQs; answer procedure limits, preparation and actual language. New ES base and translations in existing locales; no new URL.');
    const langs=s.slug==='consulta-salud-vascular-circulatoria'?'español, inglés, húngaro o alemán':'español';
    for(const key of ['heroDescription','detailBody']){let v=s[key];if(!v)continue;v=v.replaceAll('español, inglés o portugués',langs).replaceAll('inglés o portugués',langs);if(key==='heroDescription'&&p.locale!=='es')v=booking[p.locale](actualLanguages);if(v!==s[key]){before[key]=s[key];after[key]=v;reasons.push(`${key}: unsupported consultation language corrected against assigned doctor. Longer Spanish clinical body in non-ES records remains a separate localization hold.`);}}
   }
   if(s.slug==='dermatologia-especialista-online')for(const [i,sortOrder] of [0,1,4].entries()){
    const f=native.find(f=>f.sortOrder===sortOrder);assert(f);faqPatches.push({id:f.id,before:{question:f.question,answer:f.answer},after:{question:f.question,answer:dermAnswers[p.locale][i]}});
   }
  }
  for(const link of s.links??[])if(['neurologo-online','pediatra-especialista-online'].includes(link.targetSlug)){
   const d=linkDrafts.get(link.id)??{key:`link:${link.id}`,id:link.id,sourceServiceId:s.id,targetSlug:link.targetSlug,urls:[],before:{isActive:true},after:{isActive:false},reason:'Observed linked destination returns 404 in all six locales. Remove unavailable-service callout, retain stored rows for rollback; no redirect.'};d.urls.push(p.url);linkDrafts.set(link.id,d);
  }
 }else{
  const f=native.find(f=>f.sortOrder===4);assert(f,`Booking FAQ ${p.url}`);
  const langs=s.languages.map(l=>{const i=languageNames.en.indexOf(l);assert(i>=0,l);return languageNames[p.locale][i];}).join(', ');
  // Retain the existing emergency passage verbatim, including its helpline, when present.
  const safety=f.answer.includes('112')?f.answer.split(/(?<=[.!])\s+/).filter(t=>/112|717|crisis|kriz|criz|crise|Krise|self-harm|autoles|sebepoško/.test(t)).join(' '):'';
  faqPatches.push({id:f.id,before:{question:f.question,answer:f.answer},after:{question:f.question,answer:`${booking[p.locale](langs)}${safety?' '+safety:''}`}});
  reasons.push('Replace immediate-calendar/same-day boilerplate with current booking checks and recorded consultation languages; preserve existing emergency passage.');
  if(s.slug==='dr-javier-villarte-betancor')for(const key of ['seoDescription'])if(s[key]?.includes('A014346')){before[key]=s[key];after[key]=s[key].replaceAll('A014346','AO14346');reasons.push('COPAO named directory confirms AO14346; fix copy typo only, preserve stored credential.');}
 }
 if(faqPatches.length&&type(p)==='service')reasons.push('Replace image-only dermatoscopy/definitive-diagnosis and same-day biopsy claims; retain six other answers. Clinical review required.');
 if(Object.keys(after).length||faqPatches.length||addedFaqs.length){
  const hold=s.slug==='dr-luz-marina-zuluaga-rios'?'Current exercise status discrepancy':s.slug==='dr-tomas-ruiz-palacios'?'Official registration not independently verified':/consulta-diagnotico-vascular|consulta-flebologia-y-linfologia/.test(s.slug)?'Specialist scope unresolved: CGCOM lists assigned doctor as Médico General':s.bookability.state!=='BOOKABLE'?'No current open appointment; retain routing and assignments':'';
  const exerciseHold=type(p)==='service'&&s.assignedDoctorIds.some(id=>roster.some(d=>d.id===id&&d.slug==='dr-luz-marina-zuluaga-rios'))?'Assigned clinician Luz: current exercise status discrepancy; operations clarification required':'';
  const d={key:`${type(p)}:${s.slug}`,url:p.url,affectedUrls:pages.filter(x=>x.status===200&&new URL(x.url).pathname.split('/')[4]===s.slug).map(x=>x.url),slug:s.slug,id:s.id,locale:p.locale,resolvedLocale:s.resolvedLocale,source:response.source,sourceFingerprint:hash(s),before,after,faqPatches,addedFaqs,removedEmbeddedSection:'',reasons,hold:[hold,exerciseHold].filter(Boolean).join('; '),status:'local candidate; unapproved; not applied'};d.payloadSha256=hash(d);drafts.push(d);
 }
}
const keywordRows=[],exclusions=[];
const ownerMap={'médico online':'consulta-medica-online','consulta médica online':'consulta-medica-online','dermatólogo online':'dermatologia-especialista-online','dermatología online':'dermatologia-especialista-online','psicólogo online':'psicologo-online','psiquiatra online':'psiquiatra-online','cardiólogo online':'cardiologo-online','justificante médico online':'justificante-medico-online','segunda opinión médica':'segunda-opinion-medica','flebología online':'consulta-flebologia-y-linfologia','medicina estética online':'consulta-online-medicina-estetica'};
for(const k of read('raw/metrics-es-2026-09-13.json').keywords){assert(k.keyword,'Compressed keyword evidence must not be treated as complete');keywordRows.push({keyword:k.keyword,language:'es',location:2724,owner_url:`https://www.myglobalhealth.online/spain/es/services/${ownerMap[k.keyword]}`,search_volume:k.search_volume??'',difficulty:k.keyword_difficulty??'',intent_provider:k.main_intent??'',source:'raw/metrics-es-2026-09-13.json',evidence_type:'measured keyword',decision:/cardiólogo|flebología/.test(k.keyword)?'hold supply/specialty':k.keyword.includes('justificante')?'private document only; public-system/template intent excluded':'existing service; no new page'});}
for(const term of ['baja laboral oficial','médico gratis','urgencias online','dermatólogo cerca de mí','neurologo online','pediatra especialista online','plantilla justificante médico','doctoralia'])exclusions.push({keyword:term,reason:'Public-system/free/emergency/local-only/unavailable specialty/template/competitor-brand intent unsupported; no commercial targeting',search_volume:'unavailable'});
const matrix=pages.map(p=>{
 const candidate=drafts.find(d=>d.url===p.url)??drafts.find(d=>d.affectedUrls.includes(p.url)&&d.resolvedLocale==='ES'&&d.locale==='es');
 const links=[...linkDrafts.values()].filter(d=>d.urls.includes(p.url));
 const current=gsc.current.filter(r=>r.keys[0]===p.url),prev=gsc.previous.filter(r=>r.keys[0]===p.url),sum=(r,k)=>r.reduce((a,r)=>a+r[k],0);
 const cov=coverage.find(c=>c.url===p.url),kw=keywordRows.filter(k=>k.owner_url===p.url),qs=queries.rows.filter(r=>r.keys[1]===p.url).sort((a,b)=>b.impressions-a.impressions).slice(0,5);
 let disposition=candidate||links.length?'change':'retain with evidence',reason=candidate?.reasons.join(' ')??'Live metadata, canonical and content retained; no demonstrated benefit from rewriting this page. Retention does not certify clinical/legal claims.';
 if(p.status!==200){disposition='hold';reason='Linked unavailable specialty; remove source callouts after approved exact manifest. Do not create or redirect unavailable care.';}
 else if(candidate?.hold){disposition='hold';reason=candidate.hold+'; exact correction candidate prepared, other claims retained pending evidence.';}
 else if(/baja-laboral-por-ansiedad/.test(p.url)){disposition='hold';reason='State sick-leave commercial fit remains held (ledger §53). BOE Art.2: public service/mutua route; no cluster expansion.';}
 else if(type(p)==='book'){reason='Browser: localized H1 and 23 service choices verified in six locales; no paid booking made. Minor English UI labels retained as localization debt.';}
 else if(type(p)==='legal'){reason='Legal body retained; actual status/canonical/robots recorded. No legal certification or new translation.';}
 const supplied=supply.find(s=>s.url===p.url);
 if(supplied?.registry_issue){disposition='hold';reason+=' '+supplied.registry_issue+'; confirm lawful current exercise before promoting affected care.';}
 if(supplied?.bookability==='UNAVAILABLE'){disposition='hold';reason+=' No current open appointment; operations must resolve supply without changing credentials.';}
 if(p.locale!=='es'&&Object.keys(missingFaqs).some(slug=>p.url.endsWith('/'+slug)))reason+=' Stored long-form body is Spanish in this locale; localized hero/FAQ candidates do not complete body localization. Clinical source and native-language review required.';
 const status=p.status===200&&(!p.canonical||p.canonical!==p.url)&&!p.finalUrl?.includes('/faq')?'verify further':disposition;
 return {url:p.url,locale:p.locale,page_type:type(p),discovery:p.discovery,http_status:p.status,canonical:p.canonical,robots:p.robots,keyword_ownership:kw.map(k=>k.keyword).join(' | '),keyword_evidence:kw.length?'measured Spain/es; keyword master':qs.length?'observed GSC query/page; no volume inference':'editorial page role; unmeasured',observed_queries:qs.map(q=>q.keys[0]).join(' | '),current_clicks:sum(current,'clicks'),current_impressions:sum(current,'impressions'),previous_clicks:sum(prev,'clicks'),previous_impressions:sum(prev,'impressions'),existing_title:p.title,existing_description:p.description,existing_h1:p.h1?.join(' | '),proposed_fields:JSON.stringify(candidate?.after??{}),faq_native:cov?.native_api,faq_embedded:cov?.embedded,faq_proposed_patches:candidate?.faqPatches.length??0,faq_proposed_additions:candidate?.addedFaqs.length??0,source_fingerprint:candidate?.sourceFingerprint??p.sha256,source:candidate?.source??'raw/public-inventory-2026-09-13.json',disposition:status,reason,review_status:candidate?'clinical review pending':'retained; no new certification',implementation_status:candidate||links.length?'not applied; storage/approval/deployment pending':'no mutation',draft_key:candidate?.key??'',link_changes:links.map(l=>l.key).join(' | ')};
});
const facts=roster.map(d=>{const r=registry.records.find(r=>r.slug===d.slug);return {doctor_id:d.id,name:d.fullName,slug:d.slug,stored_number:d.imcRegistration,official_number:r?.number??'',official_name:r?.name??'',official_specialty:r?.specialty??'',official_status:r?.status??'unverified',verification_status:d.slug==='dr-luz-marina-zuluaga-rios'?'discrepancy: alta sin ejercicio':r?'named registry record observed; biography not certified':'unverified',consultation_languages:d.languages.join(' | '),bookability:d.bookability.state,source:r?.source??d.medicalRegistrationUrl,scope_hold:d.slug==='dr-leandro-wang'?'Specialist service claims exceed registry General label; require qualification evidence':d.slug==='dr-silvina-irale'?'Registry Médico General; do not promote as specialist pediatrician':d.slug==='dr-tomas-ruiz-palacios'?'Named official record required':'Retain detailed biography claims; not independently verified'};});
write('content-briefs/exact-drafts.json',drafts);write('content-briefs/link-drafts.json',[...linkDrafts.values()]);
csv('faq-coverage.csv',coverage);csv('doctor-service-language-matrix.csv',supply);csv('doctor-profile-fact-register.csv',facts);
csv('03-keyword-master.csv',keywordRows);csv('keyword-exclusions.csv',exclusions);csv('page-by-page-completion-matrix.csv',matrix);
csv('target-page-inventory.csv',matrix.map(({url,locale,page_type,discovery,http_status,canonical,robots})=>({url,locale,page_type,discovery,http_status,canonical,robots})));
csv('05-url-keyword-map.csv',matrix.map(({url,locale,page_type,keyword_ownership,keyword_evidence,observed_queries,disposition})=>({url,locale,page_type,keyword_ownership,keyword_evidence,observed_queries,disposition})));
csv('04-content-gap.csv',matrix.filter(r=>r.disposition!=='retain with evidence').map(({url,locale,reason,disposition,draft_key})=>({url,locale,reason,disposition,draft_key})));
// This generated register uses single-line quoted cells. Preserve genuine review records;
// changed payloads cannot inherit approval from an earlier draft.
const registerPath=`${root}/clinical-review-register.csv`;
const oldLines=fs.existsSync(registerPath)?fs.readFileSync(registerPath,'utf8').trim().split(/\r?\n/):[];
const cells=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
const header=oldLines.length?cells(oldLines.shift()):[];
const oldReviews=oldLines.map(line=>Object.fromEntries(cells(line).map((v,i)=>[header[i],v])));
const register=drafts.map(d=>{
 const old=oldReviews.find(r=>r.url===d.url);
 const reviewed=old&&(old.reviewer_doctor_id||old.reviewed_at||old.approved_sha256);
 if(reviewed)assert.equal(old.payload_sha256,d.payloadSha256,`Reviewed payload changed: ${d.url}; reconcile explicitly`);
 return reviewed?old:{key:d.key,url:d.url,locale:d.locale,payload_sha256:d.payloadSha256,reviewer_doctor_id:'',reviewed_at:'',approved_sha256:'',status:d.hold?'held: '+d.hold:'pending named clinical review',rule:'ledger §43.4–43.5',source:d.source};
});
assert(oldReviews.filter(r=>r.reviewer_doctor_id||r.reviewed_at||r.approved_sha256).every(r=>register.some(n=>n.url===r.url)),'Cannot remove reviewed record');
csv('clinical-review-register.csv',register);
const segments={};for(const period of ['current','previous']){segments[period]={};for(const row of gsc[period]){const url=row.keys[0],p=pages.find(p=>p.url===url);const k=p?type(p):'legacy_or_uninventoried';const a=segments[period][k]??={clicks:0,impressions:0};a.clicks+=row.clicks;a.impressions+=row.impressions;}}
const summary={pages:pages.length,sitemap:pages.filter(p=>p.discovery==='sitemap').length,types:matrix.reduce((a,r)=>(a[r.page_type]=(a[r.page_type]??0)+1,a),{}),drafts:drafts.length,groups:new Set(drafts.map(d=>d.key)).size,addedBaseFaqs:drafts.filter(d=>d.locale==='es').reduce((a,d)=>a+d.addedFaqs.length,0),addedFaqLocaleVariants:drafts.reduce((a,d)=>a+d.addedFaqs.length,0),faqPatches:drafts.reduce((a,d)=>a+d.faqPatches.length,0),linkGroups:linkDrafts.size,nativeFaqs:coverage.reduce((a,c)=>a+c.native_api,0),embeddedFaqs:coverage.reduce((a,c)=>a+c.embedded,0),faqMismatches:coverage.filter(c=>!c.equivalent).length,dispositions:matrix.reduce((a,r)=>(a[r.disposition]=(a[r.disposition]??0)+1,a),{}),segments};
write('raw/package-summary.json',summary);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
write('content-briefs/review-packet.html',`<!doctype html><meta charset="utf-8"><title>Spain exact content review</title><style>body{max-width:1100px;margin:40px auto;font:16px/1.6 system-ui;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;padding:18px}article{border-top:2px solid #ccc;margin-top:40px}td,th{vertical-align:top;text-align:left;padding:12px;width:50%}table{width:100%;table-layout:fixed}</style><h1>Spain exact content review</h1><p>Local candidates, not clinical approval or publication. Storage snapshot and hash-bound row manifest remain pending authenticated access. All unchanged biographies, operational fields and legal bodies are retained without new certification.</p><p>${escape(JSON.stringify(summary))}</p>${drafts.map(d=>`<article><h2>${escape(d.key)} / ${d.locale}</h2><p>${escape(d.url)}</p><p>Payload SHA-256: ${d.payloadSha256}</p><p>${escape(d.reasons.join(' '))}</p><p>Hold: ${escape(d.hold||'Named reviewer, review-age policy, storage reconciliation and production authorization.')}</p><table><tr><th>Before</th><th>After</th></tr><tr><td><pre>${escape(JSON.stringify({fields:d.before,faqs:d.faqPatches.map(f=>f.before)},null,2))}</pre></td><td><pre>${escape(JSON.stringify({fields:d.after,faqChanges:d.faqPatches.map(f=>f.after),newFaqs:d.addedFaqs},null,2))}</pre></td></tr></table></article>`).join('')}<h2>Unavailable service callouts</h2><pre>${escape(JSON.stringify([...linkDrafts.values()],null,2))}</pre>`);
console.log(JSON.stringify(summary));
