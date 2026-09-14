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
 assert.equal(after.title,draft?.after.seoTitle??before.title,'Title mismatch');
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
 const key=process.argv.find(a=>a.startsWith('--group='))?.slice(8),manifest=read('content-briefs/storage-mutation-manifest.json');
 const group=manifest.groups.find(g=>g.key===key);assert(group,'Prepared storage group required');
 const stem=key.replaceAll(':','-'),receipt=read(`raw/rollout/${stem}-applied.json`);
 assert.equal(receipt.approvalSha256,group.approvalSha256,'Mutation receipt mismatch');assert.equal(receipt.dryRun,false);
 assert.equal(manifest.draftsSha256,hash(read('content-briefs/exact-drafts.json')),'Drafts changed');
 const inventory=read('raw/public-inventory-2026-09-13.json'),drafts=read('content-briefs/exact-drafts.json'),links=read('content-briefs/link-drafts.json'),results=[];
 const appliedKeys=new Set(manifest.groups.slice(0,manifest.groups.indexOf(group)+1).map(g=>g.key));
 for(const url of group.urls){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)}),html=await response.text();
  const after={...parse(html,url),status:response.status,finalUrl:response.url};
  const before=inventory.find(p=>p.url===url);assert(before,'Baseline missing');
  const slug=new URL(url).pathname.split('/')[4],localized=fs.existsSync(`${root}/content-briefs/body-localization.json`)&&read('content-briefs/body-localization.json')[slug]&&appliedKeys.has(`service:${slug}`);
  const localizedUrls=localized?['es','en','pt','cs','ro','de'].map(l=>url.replace(/\/spain\/[a-z]{2}\//,`/spain/${l}/`)):undefined;
  results.push(verifyPage(before,after,drafts.find(d=>d.url===url&&appliedKeys.has(d.key)),links.filter(l=>l.urls.includes(url)&&appliedKeys.has(l.key)),{localizedUrls}));
 }
 fs.writeFileSync(`${root}/raw/rollout/${stem}-public.json`,JSON.stringify({checkedAt:new Date().toISOString(),group:key,approvalSha256:group.approvalSha256,results,browserVerification:'pending; see handoff'},null,2));
 console.log(JSON.stringify({group:key,passed:results.length,browserVerification:'pending'}));
}
