import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parse } from './collect-public-inventory.mjs';
const root = 'seo/romania', read = p => JSON.parse(fs.readFileSync(`${root}/${p}`, 'utf8'));
const key = process.argv.find(v => v.startsWith('--group='))?.slice(8);
const manifest = read('content-briefs/storage-mutation-manifest-2026-09-13.json');
const group = manifest.groups.find(g => g.key === key); assert(group, 'Unknown group');
const services = read('content-briefs/service-drafts.json'), doctors = read('content-briefs/doctor-drafts.json');
const stem = key.replaceAll(':','-'), receiptFile = `raw/rollout/${stem}-applied.json`, receipt = read(receiptFile);
assert.equal(receipt.approvalSha256, group.approvalSha256);
const drafts = key === 'obsolete-sick-note-offer' ? services.filter(d => d.slug === 'medic-online-romania') : [...services,...doctors].filter(d => group.urls.includes(d.url));
const oldPages = [...read('raw/public-inventory-2026-09-13.json'), ...read('raw/linked-extra-pages-2026-09-13.json')];
const plain = value => String(value??'').replace(/\s+/g,' ').trim();
// Execute the existing renderer's pure title rule, including its own constants.
const metadataSource = fs.readFileSync('frontend/lib/seo/page-seo.ts','utf8');
const titleRule = metadataSource.slice(metadataSource.indexOf('const SOCIAL_TITLE_LIMIT'), metadataSource.indexOf('function normalizeCustomImage'));
const { stripTypeScriptTypes } = await import('node:module');
const renderedTitle = vm.runInNewContext(stripTypeScriptTypes(`const SITE_NAME = 'Global Health';\n${titleRule}\ncompactSearchTitle;`));
const results = await Promise.all(drafts.map(async d => {
  const old = read(d.source), isService = d.url.includes('/services/');
  const apiResponse = await fetch(`https://api.myglobalhealth.online${old.endpoint}`, { signal:AbortSignal.timeout(45000) });
  assert.equal(apiResponse.status,200);
  const json = await apiResponse.json(), actual = json.data?.service ?? json.data?.doctor;
  assert(actual);
  assert.equal(actual.seoTitle,d.after.seoTitle, `${d.url}: API title`);
  let expectedFaqs;
  if (isService) {
    const original = old.data.service;
    for (const field of ['seoDescription','heroTitle']) assert.equal(actual[field],d.after[field],`${d.url}: ${field}`);
    for (const field of ['id','kind','slug','basePriceCents','durationMinutes','currencyCode','assignedDoctors']) assert.deepEqual(actual[field],original[field],`${d.url}: protected ${field}`);
    assert.equal(actual.resolvedLocale,d.locale.toUpperCase());
    if (key === 'obsolete-sick-note-offer' && d.locale === 'en') {
      const afterBody = group.changes.find(c => c.table === 'serviceTranslations').after.detailBody;
      assert.equal(actual.detailBody,afterBody);
    } else assert.equal(actual.detailBody,d.after.detailBody,`${d.url}: embedded FAQ removal`);
    expectedFaqs=d.after.faqs;
  } else {
    const original=old.data.doctor;
    for(const field of ['id','slug','fullName','title','bio','languages','qualifications','assignedServices']) assert.deepEqual(actual[field],original[field],`${d.url}: protected ${field}`);
    expectedFaqs=original.faqs.map(f => ({ ...f, ...(d.faqPatches.find(p=>p.id===f.id)?.after??{}) }));
  }
  assert.deepEqual(actual.faqs.map(f=>({question:f.question,answer:f.answer})),expectedFaqs.map(f=>({question:f.question,answer:f.answer})),`${d.url}: API FAQs`);
  const response=await fetch(d.url,{signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,200);
  const page=parse(await response.text(),d.url), previous=oldPages.find(p=>p.url===d.url);
  assert.equal(page.title,renderedTitle(d.after.seoTitle),`${d.url}: rendered title may still be cached`);
  if(isService){assert.equal(page.description,d.after.seoDescription);assert.deepEqual(page.h1,[d.after.heroTitle]);}
  else {assert.deepEqual(page.h1,previous.h1);assert.equal(page.description,previous.description);}
  assert.equal(page.canonical,d.url);
  assert.deepEqual(page.hreflang,previous.hreflang,`${d.url}: alternates changed`);
  assert.equal(page.robots,previous.robots);
  assert.equal(page.schemaFaqCount,expectedFaqs.length);
  assert.deepEqual(page.schemaFaqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),expectedFaqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),`${d.url}: FAQ schema text differs`);
  assert.deepEqual(page.faqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),expectedFaqs.map(f=>({question:plain(f.question),answer:plain(f.answer)})),`${d.url}: visible FAQs/schema mismatch or stale cache`);
  if(key==='obsolete-sick-note-offer') assert(!page.links.some(l=>l.href.includes('/services/sick-note-romania')));
  return {url:d.url,checkedAt:new Date().toISOString(),status:response.status,title:page.title,description:page.description,h1:page.h1,canonical:page.canonical,hreflang:page.hreflang,robots:page.robots,faqs:page.faqs,schemaFaqCount:page.schemaFaqCount,protectedApiFieldsVerified:true};
}));
fs.writeFileSync(`${root}/raw/rollout/${stem}-public.json`,JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(`${root}/${receiptFile}`,JSON.stringify({...receipt,publicVerified:true,publicVerifiedAt:new Date().toISOString(),verifiedUrls:results.map(r=>r.url)},null,2)+'\n');
const ledgerPath='docs/plans/seo-control-state.md';
const ledger=fs.readFileSync(ledgerPath,'utf8');
fs.writeFileSync(ledgerPath,ledger.replace(`- Romania rollout \`${key}\`: database saved; public readback pending.`, `- Romania rollout \`${key}\`: applied and publicly verified across ${results.length} locales (${new Date().toISOString()}).`));
console.log(JSON.stringify({group:key,publicVerified:true,pages:results.length}));
