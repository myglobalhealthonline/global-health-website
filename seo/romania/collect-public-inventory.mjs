// Read-only public collection. Run from repository root; cached responses avoid repeat requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const localRequire = createRequire(import.meta.url);
const require = createRequire(localRequire.resolve('../../backend/node_modules/sanitize-html'));
const { parseDocument, DomUtils } = require('htmlparser2');
const root = 'seo/romania';
const origin = 'https://www.myglobalhealth.online';
const text = n => DomUtils.textContent(n).replace(/\s+/g, ' ').trim();
const all = (doc, fn) => DomUtils.findAll(fn, doc.children ?? []);
const tags = (doc, tag) => all(doc, n => n.name === tag);
export function parse(html, url) {
  const doc = parseDocument(html);
  const meta = name => all(doc, n => n.name === 'meta' && n.attribs?.name === name)[0]?.attribs.content ?? '';
  const links = tags(doc, 'link');
  const main = tags(doc, 'main')[0] ?? doc;
  const schemas = tags(doc, 'script').filter(n => n.attribs.type === 'application/ld+json').flatMap(n => {try{return [JSON.parse(DomUtils.textContent(n))]}catch{return []}});
  const types = new Set(); let schemaFaqCount = 0; const schemaFaqs = [];
  function visit(v) { if (!v || typeof v !== 'object') return; if (v['@type']) for (const t of [v['@type']].flat()) types.add(t); if(v['@type']==='FAQPage') { schemaFaqCount += (v.mainEntity??[]).length; schemaFaqs.push(...(v.mainEntity??[]).map(q=>({question:q.name,answer:q.acceptedAnswer?.text}))); } for(const x of Object.values(v)) if(typeof x==='object') Array.isArray(x)?x.forEach(visit):visit(x); }
  schemas.forEach(visit);
  const faqs = tags(main, 'details').map(n => ({question: text(tags(n,'summary')[0]??{children:[]}),answer:tags(n,'p').map(text).join(' ')})).filter(f=>f.question);
  const body = parseDocument(DomUtils.getOuterHTML(main));
  for(const n of all(body,n=>['script','style','nav','footer','svg'].includes(n.name))) DomUtils.removeElement(n);
  return {url,locale:new URL(url).pathname.split('/')[2],title:tags(doc,'title').map(text).join(''),description:meta('description'),h1:tags(main,'h1').map(text),h2:tags(main,'h2').map(text),robots:meta('robots'),canonical:links.find(n=>n.attribs.rel==='canonical')?.attribs.href??'',hreflang:links.filter(n=>n.attribs.hreflang).map(n=>({lang:n.attribs.hreflang,url:n.attribs.href})),schemaTypes:[...types],schemaFaqCount,schemaFaqs,faqs,body:text(body),links:tags(main,'a').map(n=>({text:text(n),href:n.attribs.href??''})),sha256:createHash('sha256').update(html).digest('hex')};
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(45000)});return {html:await r.text(),status:r.status,finalUrl:r.url,checkedAt:new Date().toISOString()};}
async function run(){
  await fs.mkdir(`${root}/raw/html`,{recursive:true});
  const sm=await get(`${origin}/sitemap.xml`); assert.equal(sm.status,200);
  await fs.writeFile(`${root}/raw/sitemap-2026-09-13.xml`,sm.html);
  const urls=[...new Set([...sm.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).filter(u=>u.startsWith(`${origin}/romania/`)))]; assert(urls.length>0);
  await fs.writeFile(`${root}/raw/sitemap-urls.json`,JSON.stringify(urls,null,2));
  const results=[];let next=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<urls.length){const url=urls[next++];const file=`${root}/raw/html/${createHash('sha256').update(url).digest('hex').slice(0,20)}.json`;try{let r;try{r=JSON.parse(await fs.readFile(file,'utf8'))}catch{r=await get(url);await fs.writeFile(file,JSON.stringify(r))}results.push({...parse(r.html,url),status:r.status,finalUrl:r.finalUrl,checkedAt:r.checkedAt});}catch(e){results.push({url,error:e.message})}if(results.length%30===0)console.log(`Collected ${results.length}/${urls.length}`)}}));
  results.sort((a,b)=>a.url.localeCompare(b.url));
  await fs.writeFile(`${root}/raw/public-inventory-2026-09-13.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify({pages:results.length,errors:results.filter(r=>r.error).length,locales:results.reduce((a,r)=>(a[r.locale]=(a[r.locale]??0)+1,a),{})}));
}
if(process.argv.includes('--check')){const r=parse('<html><head><title>A &amp; B</title><link rel="canonical" href="https://example.com"/><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question"}]}</script></head><body><main><h1>Hello</h1><details><summary>Question?</summary><p>Answer.</p></details></main></body></html>',`${origin}/romania/ro`);assert.equal(r.title,'A & B');assert.equal(r.faqs[0].answer,'Answer.');assert.equal(r.schemaFaqCount,1);console.log('Parser check passed');}else if(process.argv[1]?.endsWith('collect-public-inventory.mjs')) await run();

