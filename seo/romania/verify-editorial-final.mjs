import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parse } from './collect-public-inventory.mjs';
const root='seo/romania',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
for(const [file,hash] of Object.entries(read('editorial-deployment-package-2026-09-13.json').sourceSha256)) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
const before=read('raw/editorial-public-before-2026-09-13.json'),results=[];let next=0;
await Promise.all(Array.from({length:5},async()=>{while(next<before.length){const old=before[next++];try{
  const r=await fetch(old.url,{signal:AbortSignal.timeout(45000)}),page=parse(await r.text(),old.url);
  assert.equal(r.status,old.status,'status');assert.equal(page.canonical,old.canonical,'canonical');assert.equal(page.robots,old.robots,'robots');assert.deepEqual(page.hreflang,old.hreflang,'hreflang');
  results.push({...page,status:r.status,checkedAt:new Date().toISOString(),visibleChanged:page.body!==old.body,beforeEmDashes:old.body.split('—').length-1,afterEmDashes:page.body.split('—').length-1});
}catch(e){results.push({url:old.url,error:e.message});}}}));
results.sort((a,b)=>a.url.localeCompare(b.url));
fs.writeFileSync(`${root}/raw/editorial-public-after-2026-09-13.json`,JSON.stringify(results,null,2)+'\n');
const summary={checkedAt:new Date().toISOString(),pages:results.length,errors:results.filter(p=>p.error),visibleChanged:results.filter(p=>p.visibleChanged).length,beforeEmDashes:results.reduce((n,p)=>n+(p.beforeEmDashes??0),0),afterEmDashes:results.reduce((n,p)=>n+(p.afterEmDashes??0),0),deployedSourceHashesMatch:true};
fs.writeFileSync(`${root}/raw/editorial-rollout/final-public-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));assert.equal(summary.errors.length,0);
