// One reviewed logical group per transaction. Default is a read-only dry-run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connect} from './romania-seo-storage.mjs';
import {readSpain} from './spain-seo-storage.mjs';
import {readBrazil} from './brazil-seo-storage.mjs';
import {hash,rehearse} from './prepare-spain-seo.mjs';
import {comparable,mutateRows} from './apply-romania-seo.mjs';
import {assertSpainClinicalChanges,APPROVED_SPAIN_STATES,SPAIN_REVIEW_POLICY,assertBrazilClinicalChanges,APPROVED_BRAZIL_STATES,BRAZIL_REVIEW_POLICY} from '../src/content/romania-clinical-review.ts';
export const tables={services:'Service',serviceTranslations:'ServiceTranslation',serviceFaqs:'ServiceFaq',serviceFaqTranslations:'ServiceFaqTranslation',doctorMarketTranslations:'DoctorMarketTranslation',doctorFaqs:'DoctorFaq',serviceLinks:'ServiceLink',doctors:'Doctor',doctorCountries:'DoctorCountry'};
export const withoutUpdatedAt=['DoctorCountry'];
const copy=['seoTitle','seoDescription','heroTitle','heroDescription','detailBody'];
// Doctor/DoctorCountry fields are writable only for the verified registration-typo correction group.
export const updates={services:copy,serviceTranslations:copy,serviceFaqs:['question','answer'],serviceFaqTranslations:['question','answer'],doctorMarketTranslations:['seoTitle','seoDescription'],doctorFaqs:['question','answer'],serviceLinks:['isActive'],doctors:['seoTitle','seoDescription','qualifications'],doctorCountries:['registrationNumber']};
export const inserts={serviceFaqs:['id','serviceId','question','answer','sortOrder','isVisible'],serviceFaqTranslations:['id','serviceFaqId','locale','question','answer']};
export function verifySpainApproval(manifest,approval,group,now=Date.now()){
 const policy=manifest.country==='br'?BRAZIL_REVIEW_POLICY:SPAIN_REVIEW_POLICY,states=manifest.country==='br'?APPROVED_BRAZIL_STATES:APPROVED_SPAIN_STATES;
 assert.equal(approval.manifestSha256,hash(manifest),'Approved manifest changed');
 assert.equal(approval.groups?.find(g=>g.key===group.key)?.approvedSha256,group.approvalSha256,'Exact group approval missing');
 assert(approval.reviewerDoctorId&&approval.reviewerName&&approval.evidence,'Named reviewer and genuine evidence required');
 const reviewed=Date.parse(approval.reviewedAt);assert(Number.isFinite(reviewed)&&reviewed<=now,'Invalid review date');
 assert(Number.isFinite(approval.maxAgeDays)&&approval.maxAgeDays>0&&now-reviewed<=approval.maxAgeDays*86400000,'Review expired or age policy missing');
 assert.equal(approval.maxAgeDays,policy.maxAgeDays,'Receipt and server review policy differ');
 assert(states[group.stateKey]?.some(a=>a.stateSha256===group.resultingStateSha256&&a.reviewerDoctorId===approval.reviewerDoctorId&&a.reviewedAt===approval.reviewedAt&&a.evidence===approval.evidence),'Receipt and server approval differ');
}
export function rolloutReceipt(previous,receipt){
 if(previous&&receipt.alreadyApplied){
  assert.equal(previous.approvalSha256,receipt.approvalSha256,'Repeat receipt approval drift');
  assert.equal(previous.afterSha256,receipt.afterSha256,'Repeat receipt state drift');
  return {...previous,lastRepeatCheckedAt:receipt.checkedAt};
 }
 return receipt;
}
export async function executeSpainGroup(client,expected,group,{apply=false,beforeWrite=()=>{}}={}){
 assert(['es','br'].includes(expected.country.code),'Unsupported country');
 const read=expected.country.code==='br'?readBrazil:readSpain,check=expected.country.code==='br'?assertBrazilClinicalChanges:assertSpainClinicalChanges;
 const desired=rehearse(expected,group);
 await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  if(apply)for(const op of group.changes.filter(c=>c.action==='update')){assert(tables[op.table]);await client.query(`SELECT id FROM "${tables[op.table]}" WHERE id=$1 FOR UPDATE`,[op.id]);}
  const before=await read(client);
  const alreadyApplied=JSON.stringify(comparable(before))===JSON.stringify(comparable(desired));
  if(!alreadyApplied)assert.deepEqual(comparable(before),comparable(expected),'Storage drift; reconcile before writing');
  if(apply){
   // Validate the intended transition even for a repeat; repeat execution is not an approval bypass.
   check(expected,desired);
   if(!alreadyApplied){await beforeWrite(before);await mutateRows(client,group,tables,updates,inserts,{withoutUpdatedAt});}
   const after=await read(client);assert.deepEqual(comparable(after),comparable(desired),'Protected state or content mismatch');
   check(before,after);await client.query('COMMIT');
  }else await client.query('ROLLBACK');
  return {alreadyApplied,afterSha256:hash(comparable(desired)),operations:group.changes.length};
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
}
if(process.argv[1]?.endsWith('apply-spain-seo.mjs')){
 const market=process.argv.includes('--brazil')?'brazil':'spain',root=`seo/${market}`,read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`)),arg=n=>process.argv.find(v=>v.startsWith(`--${n}=`))?.slice(n.length+3);
 // Phase 2: follow-up groups planned against the post-rollout snapshot, with their own approval and receipts.
 const phase2=process.argv.includes('--phase=2'),suffix=phase2?'-phase2':'',rolloutDir=phase2?'raw/rollout/phase2':'raw/rollout';
 const manifest=read(`content-briefs/storage-mutation-manifest${suffix}.json`);assert.equal(manifest.status,'storage prepared; no approval or publication','Authenticated storage preparation required');
 assert.equal(manifest.country,market==='brazil'?'br':'es','Manifest market mismatch');
 const group=manifest.groups.find(g=>g.key===arg('group'));assert(group,'Unknown/preflight-held group');
 const apply=process.argv.includes('--apply');
 if(apply){verifySpainApproval(manifest,read(`clinical-approval${suffix}.json`),group);assert.equal(arg('confirm'),group.approvalSha256,'Explicit production group confirmation required');assert(read(`enforcement-deployment${suffix}.json`).deploymentId,'Deployed mutation-boundary enforcement required');}
 if(phase2){const phase1=read('content-briefs/storage-mutation-manifest.json');assert.equal(manifest.afterPhase1ManifestSha256,hash(phase1),'Phase 1 manifest changed');for(const g of phase1.groups)assert.equal(read(`raw/rollout/${g.key.replaceAll(':','-')}-applied.json`).publicVerified,true,'Phase 1 not fully verified');}
 let expected=read(phase2?read('content-briefs/phase2-plan.json').snapshot:'raw/storage-preflight-2026-09-13.json').data;assert.equal(hash(expected),manifest.snapshotSha256,'Snapshot changed');
 for(const prior of manifest.groups.slice(0,manifest.groups.indexOf(group))){
  const receipt=read(`${rolloutDir}/${prior.key.replaceAll(':','-')}-applied.json`);assert.equal(receipt.approvalSha256,prior.approvalSha256);assert.equal(receipt.publicVerified,true,'Previous group not publicly verified');expected=rehearse(expected,prior);
 }
 const folder=`${root}/${rolloutDir}`,stem=group.key.replaceAll(':','-');fs.mkdirSync(folder,{recursive:true});
 const client=await connect();
 try{
  const result=await executeSpainGroup(client,expected,group,{apply,beforeWrite:before=>{
   const file=`${folder}/${stem}-before.json`;
   if(fs.existsSync(file))assert.deepEqual(comparable(JSON.parse(fs.readFileSync(file)).data),comparable(before),'Rollback snapshot drift');
   else fs.writeFileSync(file,JSON.stringify({checkedAt:new Date().toISOString(),data:before,approvalSha256:group.approvalSha256},null,2),{flag:'wx',mode:0o600});
  }});
  const receipt={group:group.key,...result,approvalSha256:group.approvalSha256,dryRun:!apply,publicVerified:false,checkedAt:new Date().toISOString()};
  if(apply){const file=`${folder}/${stem}-applied.json`;const saved=rolloutReceipt(fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null,receipt);fs.writeFileSync(file,JSON.stringify(saved,null,2));if(!result.alreadyApplied)fs.appendFileSync('docs/plans/seo-control-state.md',`\n- ${market} group ${group.key}: database committed; public verification pending. Receipt: seo/${market}/raw/rollout/${stem}-applied.json.\n`);}
  console.log(JSON.stringify(receipt));
 }catch(e){console.error(e.message.split('\n')[0]);process.exitCode=1;}finally{await client.end();}
}
