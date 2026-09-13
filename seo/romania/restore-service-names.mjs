import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { connect, readRomania } from '../../backend/scripts/romania-seo-storage.mjs';
import { comparable } from '../../backend/scripts/apply-romania-seo.mjs';
import { romanianContentStates, assertRomaniaClinicalChanges } from '../../backend/src/content/romania-clinical-review.ts';
const prepare=process.argv.includes('--prepare');
// The existing editorial CLI acts on --prepare even when imported.
process.argv=process.argv.filter(a=>a!=='--prepare');
const { project, writeChanges }=await import('../../backend/scripts/apply-romania-editorial.mjs');
const root='seo/romania',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const source=read('raw/names-storage-before.local.json').data;
const en={
 'medic-online-romania':'English-speaking doctor online in Romania',
 'reinnoire-tratament':'Online prescription renewal assessment in Romania',
 'medic-pediatru-online':'Online general medical consultation for children',
 'a-doua-opinie-medicala':'Independent second medical opinion online',
 'medicina-calatoriei':'Travel medicine consultation online',
 'consultatie-dermatologica':'Initial skin assessment online in English',
 'caderea-parului-online':'Hair loss consultation online',
 'dureri-musculo-scheletice':'Musculoskeletal pain assessment online',
 'sanatate-mintala-online':'General mental health assessment online in English',
 'boli-cronice-online':'Chronic disease management consultation online',
 'controlul-greutatii':'Medical weight management consultation online',
 'sanatatea-barbatului-online':'Men’s health consultation online in English',
 'sanatatea-femeii-online':'Women’s health consultation online in English',
 'trimiteri-si-investigatii':'Medical letters, referrals and investigation advice online',
 'consultatie-pediatrie':'Specialist paediatrician consultation online',
 'consultatie-neurologie':'Specialist neurology consultation online',
};
const main={RO:'Medic online în România',PT:'Médico online na Roménia',ES:'Médico online en Rumanía',CS:'Online lékař v Rumunsku',DE:'Online-Arzt in Rumänien'};
const renewal={RO:'Evaluare pentru reînnoirea prescripției online',PT:'Avaliação para renovação de receita online',ES:'Valoración para renovar una receta online',CS:'Online konzultace k obnovení receptu',DE:'Onlineberatung zur Rezeptverlängerung'};
const travel={RO:'Consultație de medicină de călătorie online',PT:'Consulta de medicina de viagem online',ES:'Consulta de medicina del viajero online',CS:'Online konzultace cestovní medicíny',DE:'Reisemedizinische Onlineberatung'};
const pain={RO:'Evaluarea durerii musculo-scheletale online',PT:'Avaliação da dor musculoesquelética online',ES:'Valoración del dolor musculoesquelético online',CS:'Online posouzení muskuloskeletální bolesti',DE:'Onlineberatung bei muskuloskelettalen Schmerzen'};
if(prepare){
 const previous=read('content-briefs/editorial-publication-manifest-2026-09-13.json').groups.flatMap(g=>g.changes).filter(c=>c.field==='name');
 const changes=[];
 for(const c of previous){
  const row=source[c.table].find(r=>r.id===c.id);assert.equal(row.name,c.after,'Name changed since editorial rollout');
  const service=c.table==='services'?row:source.services.find(s=>s.id===row.serviceId),locale=row.locale??'RO';
  assert(en[service.slug]);
  let after=locale==='EN'?en[service.slug]:service.slug==='medic-online-romania'?main[locale]:service.slug==='reinnoire-tratament'?renewal[locale]:service.slug==='medicina-calatoriei'?travel[locale]:service.slug==='dureri-musculo-scheletice'?pain[locale]:/online/i.test(row.name)?row.name:`${row.name} online`;
  assert(after&&!/—|same.day|today|în aceeași zi|am selben Tag|tentýž den|no mesmo dia|el mismo día/i.test(after));
  if(after!==row.name)changes.push({table:c.table,id:c.id,field:'name',before:row.name,after,locale,slug:service.slug});
 }
 const desired=project({clinical:source},changes).clinical;
 const manifest={authorizedBy:'Super admin, in this task',instruction:'Then do what you recommend for us we implement that',scope:'Restore meaningful locale-specific service names; preserve titles, H1s, descriptions, URLs and clinical scope',sourceSha256:hash(comparable(source)),changes};
 fs.writeFileSync(`${root}/content-briefs/service-name-restoration-2026-09-13.json`,JSON.stringify(manifest,null,2)+'\n');
 const file='backend/src/content/romania-clinical-review.ts',code=fs.readFileSync(file,'utf8'),pattern=/export const APPROVED_ROMANIA_STATES: Record<string, string\[\]> = (\{[\s\S]*?\n\});/;
 const allowed=JSON.parse(code.match(pattern)[1]),before=romanianContentStates(source);
 for(const [key,value] of Object.entries(romanianContentStates(desired)))if(value!==before[key])allowed[key]=[...new Set([...(allowed[key]??[]),value])];
 fs.writeFileSync(file,code.replace(pattern,`export const APPROVED_ROMANIA_STATES: Record<string, string[]> = ${JSON.stringify(allowed,null,2)};`));
 console.log(JSON.stringify({fields:changes.length,services:new Set(changes.map(c=>c.slug)).size,manifestSha256:hash(manifest)}));
}else{
 const manifest=read('content-briefs/service-name-restoration-2026-09-13.json');assert.equal(hash(comparable(source)),manifest.sourceSha256);
 const apply=process.argv.includes('--apply');
 if(apply){assert.equal(process.argv.find(a=>a.startsWith('--confirm='))?.slice(10),hash(manifest));assert.equal(read('raw/service-name-backend-deployment-2026-09-13.json').status,'SUCCESS');}
 const client=await connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const before=await readRomania(client);assert.deepEqual(comparable(before),comparable(source),'Production drift');
  const desired=project({clinical:before},manifest.changes).clinical;assertRomaniaClinicalChanges(before,desired);
  await writeChanges(client,manifest.changes);
  assert.deepEqual(comparable(await readRomania(client)),comparable(desired),'Only names may change');
  await client.query(apply?'COMMIT':'ROLLBACK');
  if(!apply)assert.deepEqual(comparable(await readRomania(client)),comparable(source),'Rollback restored source');
  fs.writeFileSync(`${root}/raw/service-name-${apply?'applied':'rehearsal'}-2026-09-13.json`,JSON.stringify({checkedAt:new Date().toISOString(),applied:apply,fields:manifest.changes.length,manifestSha256:hash(manifest),protectedFieldsUnchanged:true},null,2)+'\n');
  console.log(JSON.stringify({applied:apply,fields:manifest.changes.length}));
 }catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}
}
