import fs from 'node:fs/promises';
import { parse } from './collect-public-inventory.mjs';
const dir='seo/romania/raw';
const saved=JSON.parse(await fs.readFile(`${dir}/planning-serps-2026-09-13.json`,'utf8'));
const domains=['www.medic.chat','www.reginamaria.ro','www.medlife.ro','ringdoc.ro','centruldepediatrie.ro','getvig.health','www.neuroaxis.ro','neurolog.doctor','www.sanador.ro'];
const urls=[...new Set(saved.results.flatMap(r=>r.items).filter(r=>domains.includes(r.domain)&&r.url).map(r=>r.url))];
const pages=JSON.parse(await fs.readFile(`${dir}/public-inventory-2026-09-13.json`,'utf8'));
const seen=new Set(pages.map(p=>p.url));const extras=new Set();
for(const p of pages)for(const l of p.links){try{const u=new URL(l.href,p.url);if(u.origin==='https://www.myglobalhealth.online'&&u.pathname.startsWith('/romania/')&&!u.search&&!seen.has(u.origin+u.pathname))extras.add(u.origin+u.pathname)}catch{}}
for(const [name,list] of [['competitor-pages',urls],['linked-extra-pages',[...extras]]]){const results=[];for(const url of list){try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const html=await r.text();results.push({...parse(html,url),status:r.status,finalUrl:r.url,checkedAt:new Date().toISOString()});}catch(e){results.push({url,error:e.message})}}await fs.writeFile(`${dir}/${name}-2026-09-13.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({name,count:results.length,errors:results.filter(r=>r.error).length}));}
