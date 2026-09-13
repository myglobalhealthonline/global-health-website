import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { parse } from './collect-public-inventory.mjs';
const root='seo/romania',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const key=process.argv.find(a=>a.startsWith('--group='))?.slice(8);
const manifest=read('content-briefs/editorial-publication-manifest-2026-09-13.json');
const group=manifest.groups.find(g=>g.key===key);assert(group);
const state=read('raw/editorial-storage-complete-before-2026-09-13.json').data;
const baseline=read('raw/editorial-public-before-2026-09-13.json');
const row=(table,id)=>(state[table]??state.clinical[table]).find(r=>r.id===id);
const locales=['ro','en','cs','de','es','pt'];
const pageKeys={HOME:'',GENERAL_CONSULTATION:'gp-consultation-online',SPECIALIST_CONSULTATION:'see-a-specialist',DOCTORS_INDEX:'doctors'};
const pathsFor=c=>{
  const r=row(c.table,c.id);
  if(c.table==='pageTranslations')return [`${r.locale.toLowerCase()}/${pageKeys[row('pages',r.pageContentId).pageKey]}`];
  if(c.table==='legal')return [`${r.locale}/legal/${r.type.toLowerCase().replaceAll('_','-')}`];
  if(c.table==='posts')return [`${r.locale.toLowerCase()}/blog/${r.slug}`];
  if(c.table==='blogTranslations')return [`${r.locale.toLowerCase()}/blog/${r.slug}`];
  let entity;
  if(c.table==='services')entity=r;
  if(c.table==='serviceTranslations')entity=row('services',r.serviceId);
  if(c.table==='serviceLinkTranslations')entity=row('services',row('serviceLinks',r.serviceLinkId).sourceServiceId);
  if(entity)return locales.map(l=>`${l}/services/${entity.slug}`);
  const doctor=c.table==='doctors'?r:row('doctors',c.table==='doctorMarketTranslations'?row('doctorCountries',r.doctorCountryId).doctorId:r.doctorId);
  return locales.map(l=>`${l}/doctors/${doctor.slug}`);
};
const jobs=new Map();
for(const c of group.changes)for(const path of pathsFor(c)){
  const url=`https://www.myglobalhealth.online/romania/${path}`.replace(/\/$/,'');
  if(!jobs.has(url))jobs.set(url,[]);jobs.get(url).push(c);
}
const source=fs.readFileSync('frontend/lib/seo/page-seo.ts','utf8');
const titleRule=source.slice(source.indexOf('const SOCIAL_TITLE_LIMIT'),source.indexOf('function normalizeCustomImage'));
const renderedTitle=vm.runInNewContext(stripTypeScriptTypes(`const SITE_NAME='Global Health';\n${titleRule}\ncompactSearchTitle;`));
const plain=s=>parse(`<main>${s}</main>`,'https://example.com').body;
function pairs(before,after){
  if(typeof before==='string'&&typeof after==='string') {
    const a=before.split(/<[^>]*>/),b=after.split(/<[^>]*>/);
    if(a.length!==b.length)return [[plain(before),plain(after)]];
    return a.map((v,i)=>[plain(v),plain(b[i])]).filter(([a,b])=>a!==b&&a.length>12&&b.length>0);
  }
  if(before&&after&&typeof before==='object'&&typeof after==='object')return Object.keys(before).flatMap(k=>pairs(before[k],after[k]));
  return [];
}
const results=[],errors=[];let next=0;const tasks=[...jobs];
await Promise.all(Array.from({length:5},async()=>{while(next<tasks.length){const [url,changes]=tasks[next++];try{
  const previous=baseline.find(p=>p.url===url);assert(previous,`No baseline ${url}`);
  const r=await fetch(url,{signal:AbortSignal.timeout(45000)});assert.equal(r.status,previous.status);
  const page=parse(await r.text(),url);
  assert.equal(page.canonical,previous.canonical,'canonical');assert.equal(page.robots,previous.robots,'robots');
  assert.deepEqual(page.hreflang,previous.hreflang,'hreflang');
  let verifiedFragments=0;
  for(const c of changes){
    if(typeof c.before==='string'&&typeof c.after==='string'){
      if(c.field==='seoTitle'&&previous.title===renderedTitle(c.before)){assert.equal(page.title,renderedTitle(c.after),'title');verifiedFragments++;}
      if(['seoDescription','seoDesc'].includes(c.field)&&previous.description===plain(c.before)){assert.equal(page.description,plain(c.after),'description');verifiedFragments++;}
    }
    // Metadata may resemble a visible heading without owning it. Check it only above.
    for(const [before,after]of ['seoTitle','seoDescription','seoDesc'].includes(c.field)?[]:pairs(c.before,c.after))if(previous.body.includes(before)){
      assert(page.body.includes(after),`Missing revised text: ${after.slice(0,110)}`);verifiedFragments++;
    }
  }
  if(key==='clinical')assert.deepEqual(page.schemaFaqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),page.faqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),'visible/schema FAQ text');
  const storageOnly=changes.every(c=>c.table==='pageTranslations'&&c.field==='whyChooseItems'&&row('pages',row(c.table,c.id).pageContentId).showWhyChoose===false);
  assert(verifiedFragments>0||storageOnly,'No changed visible text verified');
  results.push({...page,status:r.status,checkedAt:new Date().toISOString(),verifiedFragments,storageOnly:storageOnly?'whyChooseItems saved; showWhyChoose=false, so the doctors template does not render this section':null,beforeEmDashes:previous.body.split('—').length-1,afterEmDashes:page.body.split('—').length-1});
}catch(e){errors.push({url,error:e.message.split('\n')[0]});}}}));
if(errors.length){console.error(JSON.stringify(errors,null,2));process.exitCode=1;}else{
  fs.writeFileSync(`${root}/raw/editorial-rollout/${key}-public.json`,JSON.stringify(results,null,2)+'\n');
  const file=`raw/editorial-rollout/${key}-applied.json`,receipt=read(file);
  assert.equal(receipt.sha256,group.sha256);
  fs.writeFileSync(`${root}/${file}`,JSON.stringify({...receipt,publicVerified:true,publicVerifiedAt:new Date().toISOString(),urls:results.map(r=>r.url)},null,2)+'\n');
  const ledger='docs/plans/seo-control-state.md';fs.writeFileSync(ledger,fs.readFileSync(ledger,'utf8').replace(`Romania editorial batch ${key}: saved; public readback pending.`,`Romania editorial batch ${key}: published and verified on ${results.length} URLs (${new Date().toISOString()}).`));
  console.log(JSON.stringify({group:key,publicVerified:true,pages:results.length,verifiedFragments:results.reduce((n,p)=>n+p.verifiedFragments,0)}));
}
