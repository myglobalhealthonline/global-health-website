// Read-only post-publication proof. Browser and operational checks remain explicit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse} from '../romania/collect-public-inventory.mjs';
import {createRequire} from 'node:module';
import {hash} from '../../backend/scripts/prepare-spain-seo.mjs';
const require=createRequire(import.meta.url),htmlRequire=createRequire(require.resolve('../../backend/node_modules/sanitize-html'));
const {parseDocument,DomUtils}=htmlRequire('htmlparser2');
const plain=v=>DomUtils.textContent(parseDocument(v??'')).replace(/\s+/g,' ').trim();
const normalized=faqs=>faqs.map(f=>({question:plain(f.question),answer:plain(f.answer)}));
export function verifyPage(before,after,draft,links=[],{localizedUrls}={}){
 assert.equal(after.status,200,'HTTP status');assert.equal(after.finalUrl,after.url,'Unexpected redirect');
 assert.equal(after.canonical,before.canonical,'Canonical changed');
 if(localizedUrls){
  // A newly localized service: every locale gains its own translation row, so the site's
  // per-locale publication rule makes all locales indexable with a full alternate set.
  assert.equal(after.robots,'index, follow','Localized locale not indexable');
  const es=localizedUrls.find(u=>u.includes('/es/'));
  assert.deepEqual(after.hreflang.map(h=>h.url).sort(),[...localizedUrls,es].sort(),'Alternates incomplete');
  assert.equal(after.hreflang.find(h=>h.lang==='x-default')?.url,es,'x-default changed');
 }else{
  assert.equal(after.robots,before.robots,'Robots changed');
  assert.deepEqual(after.hreflang,before.hreflang,'Alternates changed');
 }
 // buildPublicMetadata appends " · Global Health" when the stored title plus brand fits 60 chars,
 // so a shortened stored title can legitimately render with the brand.
 const title=draft?.after.seoTitle??before.title;
 assert(after.title===title||after.title===`${title} · Global Health`,`Title mismatch: ${after.title} !== ${title}`);
 assert.equal(after.description,draft?.after.seoDescription??before.description,'Description mismatch');
 assert.deepEqual(after.h1,draft?.after.heroTitle?[draft.after.heroTitle]:before.h1,'H1 mismatch');
 const expected=normalized(before.faqs);
 for(const patch of draft?.faqPatches??[]){const found=expected.filter(f=>f.question===plain(patch.before.question)&&f.answer===plain(patch.before.answer));assert.equal(found.length,1,'FAQ before mismatch');Object.assign(found[0],normalized([patch.after])[0]);}
 expected.push(...normalized(draft?.addedFaqs??[]));
 assert.deepEqual(normalized(after.faqs),expected,'Rendered FAQ mismatch');
 assert.deepEqual(normalized(after.schemaFaqs),expected,'FAQ schema mismatch');
 assert.equal(new Set(expected.map(f=>f.question)).size,expected.length,'Duplicate FAQ question');
 for(const key of ['heroDescription','detailBody'])if(draft?.after[key])assert(after.body.includes(plain(draft.after[key])),`${key} missing`);
 for(const link of links)assert(!after.links.some(a=>a.href.includes(`/services/${link.targetSlug}`)),'Obsolete offer remains');
 return {url:after.url,status:'passed',sha256:after.sha256};
}
if(process.argv[1]?.endsWith('verify-public.mjs')){
 const root=process.argv.includes('--brazil')?'seo/brazil':'seo/spain',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`));
 const phase=Number(process.argv.find(a=>a.startsWith('--phase='))?.slice(8)??1),rollout=phase>1?`raw/rollout/phase${phase}`:'raw/rollout';
 const key=process.argv.find(a=>a.startsWith('--group='))?.slice(8),manifest=read(phase>1?`content-briefs/storage-mutation-manifest-phase${phase}.json`:'content-briefs/storage-mutation-manifest.json');
 const group=manifest.groups.find(g=>g.key===key);assert(group,'Prepared storage group required');
 const stem=key.replaceAll(':','-'),receipt=read(`${rollout}/${stem}-applied.json`);
 assert.equal(receipt.approvalSha256,group.approvalSha256,'Mutation receipt mismatch');assert.equal(receipt.dryRun,false);
 if(group.copyPatch){
  // Summary/name patch: the public API (uncached) returns the approved text for every locale.
  const slug=key.slice(5),results=[];
  for(const [locale,d] of Object.entries(group.copyPatch)){
   const endpoint=`https://api.myglobalhealth.online/api/services/${slug}?countryCode=${manifest.country}&locale=${locale}`;
   const r=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,`API status ${locale}`);
   const s=(await r.json()).data?.service;assert.equal(s?.summary,d.summary,`Summary mismatch ${locale}`);if(d.name)assert.equal(s?.name,d.name,`Name mismatch ${locale}`);
   results.push({endpoint,status:'passed'});
  }
  fs.mkdirSync(`${root}/${rollout}`,{recursive:true});
  fs.writeFileSync(`${root}/${rollout}/${stem}-public.json`,JSON.stringify({checkedAt:new Date().toISOString(),group:key,approvalSha256:group.approvalSha256,results},null,2));
  console.log(JSON.stringify({group:key,passed:results.length}));process.exit(0);
 }
 if(group.textReplacements){
  // Exact text replacements: the uncached public API returns every replacement text for its locale.
  const snapshot=read(read(`content-briefs/phase${phase}-plan.json`).snapshot).data,[kind,id]=group.stateKey.split(':');
  const slug=kind==='service'?snapshot.services.find(s=>s.id===id).slug:snapshot.doctors.find(d=>d.id===id).slug,byLocale=new Map(),results=[];
  for(const c of group.changes){const locale=c.before.locale??'ES';byLocale.set(locale,[...(byLocale.get(locale)??[]),...group.textReplacements.filter(r=>r.table===c.table&&r.id===c.id&&!Array.isArray(r.to))]);}
  for(const [locale,reps] of byLocale){
   const endpoint=kind==='service'?`https://api.myglobalhealth.online/api/services/${slug}?countryCode=${manifest.country}&locale=${locale}`:`https://api.myglobalhealth.online/api/countries/${manifest.country}/doctors/${slug}?locale=${locale}`;
   const r=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,`API status ${locale}`);
   const body=JSON.stringify(await r.json());
   for(const rep of reps)assert(body.includes(JSON.stringify(rep.to).slice(1,-1)),`Replacement missing ${rep.table}/${rep.id}.${rep.field} ${locale}`);
   results.push({endpoint,status:'passed',replacements:reps.length});
  }
  fs.mkdirSync(`${root}/${rollout}`,{recursive:true});
  fs.writeFileSync(`${root}/${rollout}/${stem}-public.json`,JSON.stringify({checkedAt:new Date().toISOString(),group:key,approvalSha256:group.approvalSha256,results},null,2));
  console.log(JSON.stringify({group:key,passed:results.length}));process.exit(0);
 }
 assert.equal(manifest.draftsSha256,hash(read('content-briefs/exact-drafts.json')),'Drafts changed');
 const inventory=read('raw/public-inventory-2026-09-13.json'),drafts=read('content-briefs/exact-drafts.json'),links=read('content-briefs/link-drafts.json'),results=[];
 const appliedKeys=new Set(manifest.groups.slice(0,manifest.groups.indexOf(group)+1).map(g=>g.key));
 for(const url of group.urls){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)}),html=await response.text();
  if(group.correction){
   // Typo correction: every locale renders the corrected value and none of the old one.
   assert.equal(response.status,200,'HTTP status');assert.equal(response.url,url,'Unexpected redirect');
   assert(html.includes(group.correction.to),`Corrected value missing ${url}`);assert(!html.includes(group.correction.from),`Old value still rendered ${url}`);
   results.push({url,status:'passed'});continue;
  }
  const after={...parse(html,url),status:response.status,finalUrl:response.url};
  const before=inventory.find(p=>p.url===url);assert(before,'Baseline missing');
  const slug=new URL(url).pathname.split('/')[4],localized=fs.existsSync(`${root}/content-briefs/body-localization.json`)&&read('content-briefs/body-localization.json')[slug]&&appliedKeys.has(`service:${slug}`);
  const localizedUrls=localized?['es','en','pt','cs','ro','de'].map(l=>url.replace(/\/spain\/[a-z]{2}\//,`/spain/${l}/`)):undefined;
  results.push(verifyPage(before,after,drafts.find(d=>d.url===url&&appliedKeys.has(d.key)),links.filter(l=>l.urls.includes(url)&&appliedKeys.has(l.key)),{localizedUrls}));
 }
 fs.writeFileSync(`${root}/${rollout}/${stem}-public.json`,JSON.stringify({checkedAt:new Date().toISOString(),group:key,approvalSha256:group.approvalSha256,results,browserVerification:'pending; see handoff'},null,2));
 console.log(JSON.stringify({group:key,passed:results.length,browserVerification:'pending'}));
}
