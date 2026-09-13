import fs from 'node:fs';
import assert from 'node:assert/strict';
import {hash,rehearse} from '../../backend/scripts/prepare-romania-seo.mjs';
const root='seo/brazil',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`)),write=(p,v)=>fs.writeFileSync(`${root}/${p}`,JSON.stringify(v,null,2)+'\n');
const pages=read('raw/public-inventory-2026-09-13.json');
write('content-briefs/supplemental-exact-drafts.json',['pt','en','es'].flatMap((locale,i)=>{
 const p=pages.find(p=>p.url===`https://www.myglobalhealth.online/brazil/${locale}`);
 const home={url:p.url,before:{seoTitle:p.title,seoDescription:p.description},after:{seoTitle:['Médico online no Brasil | Consulta por vídeo','Online doctor in Brazil | Video consultations','Médico online en Brasil | Consulta por vídeo'][i],seoDescription:['Consulta por vídeo com médico de família no Brasil. Atendimento em português, inglês ou espanhol. Confira horários, serviços e preços.','Video consultations with a family doctor in Brazil, in Portuguese, English or Spanish. Check appointments, services and prices.','Consulta por vídeo con un médico de familia en Brasil, en portugués, inglés o español. Revisa horarios, servicios y precios.'][i]},sourceFingerprint:p.sha256,hold:'Winning HOME storage row/source reconciliation and clinical review required; outside current writer'};
 const book={url:`${p.url}/book`,before:{linkLabel:'Need a same-day GP instead?'},after:{linkLabel:['Ver consulta com médico de família','View family doctor consultations','Ver consultas con médico de familia'][i]},source:'frontend/app/[country]/[lang]/book/page.tsx',hold:'Separate localized frontend candidate; not implemented or deployed'};
 return[home,book].map(d=>({...d,payloadSha256:hash(d)}));
}));
const manifest=read('content-briefs/storage-mutation-manifest.json');let state=read('raw/storage-preflight-2026-09-13.json').data;
for(const g of manifest.groups)state=rehearse(state,g);
const rollback=[];
for(const g of [...manifest.groups].reverse()){
 const inverse={key:g.key,urls:g.urls,changes:[...g.changes].reverse().map(op=>{assert.equal(op.action,'update');const current=state[op.table].find(r=>r.id===op.id);return{action:'update',table:op.table,id:op.id,before:structuredClone(current),after:Object.fromEntries(Object.keys(op.after).map(k=>[k,op.before[k]]))};})};
 state=rehearse(state,inverse);rollback.push(inverse);
}
assert.deepEqual(state,read('raw/storage-preflight-2026-09-13.json').data);
write('content-briefs/rollback-plan.json',{forwardManifestSha256:hash(manifest),status:'offline inverse verified; separate rollback authorization and current-state checks required',groups:rollback});
console.log('Supplemental exact candidates saved; inverse restores original scoped rows');
