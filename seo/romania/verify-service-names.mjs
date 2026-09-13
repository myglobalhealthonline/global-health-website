import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from './collect-public-inventory.mjs';
const root='seo/romania',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const manifest=read('content-briefs/service-name-restoration-2026-09-13.json');
const results=[];
for(const locale of ['RO','EN','PT','ES','CS','DE']){
 const changes=manifest.changes.filter(c=>c.table==='serviceTranslations'&&c.locale===locale);
 for(const c of changes){
  const r=await fetch(`https://api.myglobalhealth.online/api/services/${c.slug}?countryCode=ro&locale=${locale}`);assert.equal(r.status,200);
  const s=(await r.json()).data.service;assert.equal(s.name,c.after,`${locale}/${c.slug}`);
 }
 const url=`https://www.myglobalhealth.online/romania/${locale.toLowerCase()}/book`,r=await fetch(url);assert.equal(r.status,200);
 const page=parse(await r.text(),url),before=read('raw/editorial-public-after-2026-09-13.json').find(p=>p.url===url);
 assert.equal(page.canonical,before.canonical);assert.equal(page.robots,before.robots);assert.deepEqual(page.hreflang,before.hreflang);
 // The booking cards render in the browser, outside this server-HTML readback.
 results.push({locale,url,apiNamesVerified:changes.length,bookingSeoControlsVerified:true,bookingTextVerification:'Separate browser check required',checkedAt:new Date().toISOString()});
}
fs.writeFileSync(`${root}/raw/service-name-public-2026-09-13.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
