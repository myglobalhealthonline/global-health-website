// Spain-only exact compare-and-set for page copy outside the clinical content gate (ledger §56.11):
// the home services bullet, the doctors-index FAQ and the medical disclaimer. Default is a read-only dry-run.
//   node --env-file=backend/.env backend/scripts/apply-spain-sick-leave-pages.mjs [--apply --confirm=<plan sha256>]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {connect} from './romania-seo-storage.mjs';
const planFile='seo/spain/content-briefs/phase4-pages-plan.json',folder='seo/spain/raw/rollout/phase4';
const raw=fs.readFileSync(planFile),plan=JSON.parse(raw),planSha256=createHash('sha256').update(raw).digest('hex');
const apply=process.argv.includes('--apply');
if(apply)assert.equal(process.argv.find(a=>a.startsWith('--confirm='))?.slice(10),planSha256,'Explicit plan confirmation required');
const once=(text,from,label)=>assert.equal(text.split(from).length-1,1,`${label}: expected exactly one match`);

// Returns {before, after} for one entry, or {alreadyApplied} when the stored value already holds the new text.
function transform(entry,row){
 if(entry.kind==='whoForItem'){
  const items=row.whoForItems;assert(Array.isArray(items),'whoForItems missing');
  if(items.includes(entry.to)&&!items.includes(entry.from))return {alreadyApplied:true};
  assert.equal(items.filter(i=>i===entry.from).length,1,'Bullet drift');
  return {column:'whoForItems',value:items.map(i=>i===entry.from?entry.to:i),json:true};
 }
 if(entry.kind==='faq'){
  const faq=row.faq;assert(Array.isArray(faq),'faq missing');
  if(faq.some(f=>f.question===entry.to.question)&&!faq.some(f=>f.question===entry.from.question))return {alreadyApplied:true};
  const hits=faq.filter(f=>f.question===entry.from.question&&f.answer===entry.from.answer);assert.equal(hits.length,1,'FAQ drift');
  return {column:'faq',value:faq.map(f=>f===hits[0]?{...f,...entry.to}:f),json:true};
 }
 assert.equal(entry.kind,'legal');
 if(row.content.includes(entry.to)&&!row.content.includes(entry.from))return {alreadyApplied:true};
 once(row.content,entry.from,'Disclaimer drift');
 return {column:'content',value:row.content.replace(entry.from,()=>entry.to)};
}

const client=await connect(),results=[];
try{
 await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const before=[];
 for(const entry of plan.entries){
  const q=entry.kind==='legal'
   ?`SELECT d.id,d.content,d.type,d.locale,co.code FROM "CountryLegalDocument" d JOIN "Country" co ON co.id=d."countryId" WHERE d.id=$1${apply?' FOR UPDATE OF d':''}`
   :`SELECT t.id,t.locale,t."whoForItems",t.faq,p."pageKey",co.code FROM "PageContentTranslation" t JOIN "PageContent" p ON p.id=t."pageContentId" JOIN "Country" co ON co.id=p."countryId" WHERE t.id=$1${apply?' FOR UPDATE OF t':''}`;
  const {rows}=await client.query(q,[entry.id]);assert.equal(rows.length,1,`Missing ${entry.id}`);const row=rows[0];
  // Spain-only guard: every row must belong to the es market and match the planned page and locale.
  assert.equal(row.code,'es',`Row outside Spain: ${entry.id}`);
  if(entry.kind==='legal'){assert.equal(row.type,'MEDICAL_DISCLAIMER');assert.equal(row.locale,'es');}
  else{assert.equal(row.pageKey,entry.pageKey,'Page drift');assert.equal(row.locale,entry.locale,'Locale drift');}
  before.push(row);
  const t=transform(entry,row);results.push({id:entry.id,kind:entry.kind,locale:entry.locale??row.locale,alreadyApplied:!!t.alreadyApplied});
  if(apply&&!t.alreadyApplied){
   const table=entry.kind==='legal'?'CountryLegalDocument':'PageContentTranslation';
   const r=await client.query(`UPDATE "${table}" SET "${t.column}"=$1${t.json?'::jsonb':''},"updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`,[t.json?JSON.stringify(t.value):t.value,entry.id]);
   assert.equal(r.rowCount,1,`Row count ${entry.id}`);
  }
 }
 if(apply){
  // Read back inside the transaction before committing.
  for(const entry of plan.entries){
   const q=entry.kind==='legal'?'SELECT content FROM "CountryLegalDocument" WHERE id=$1':'SELECT "whoForItems",faq FROM "PageContentTranslation" WHERE id=$1';
   const {rows:[row]}=await client.query(q,[entry.id]);
   if(entry.kind==='legal')assert(row.content.includes(entry.to)&&!row.content.includes(entry.from),'Disclaimer readback');
   else if(entry.kind==='whoForItem')assert(row.whoForItems.includes(entry.to)&&!row.whoForItems.includes(entry.from),'Bullet readback');
   else assert(row.faq.some(f=>f.question===entry.to.question&&f.answer===entry.to.answer),'FAQ readback');
  }
  fs.mkdirSync(folder,{recursive:true});
  const beforeFile=`${folder}/pages-before.json`;
  if(!fs.existsSync(beforeFile))fs.writeFileSync(beforeFile,JSON.stringify({checkedAt:new Date().toISOString(),planSha256,rows:before},null,2),{flag:'wx',mode:0o600});
  await client.query('COMMIT');
  fs.writeFileSync(`${folder}/pages-applied.json`,JSON.stringify({checkedAt:new Date().toISOString(),planSha256,dryRun:false,results},null,2));
 }else await client.query('ROLLBACK');
 console.log(JSON.stringify({planSha256,dryRun:!apply,results}));
}catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message.split('\n')[0]);process.exitCode=1;}finally{await client.end();}
