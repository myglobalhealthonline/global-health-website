import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connect } from './romania-seo-storage.mjs';
import { readEditorial } from './romania-editorial-storage.mjs';
import { comparable } from './apply-romania-seo.mjs';
import { romanianContentStates, assertRomaniaClinicalChanges } from '../src/content/romania-clinical-review.ts';

const root='seo/romania', read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const descriptors={
  services:['Service','name','summary','seoTitle','seoDescription','heroTitle','heroDescription','detailBody','ctaLabel'],
  serviceTranslations:['ServiceTranslation','name','summary','seoTitle','seoDescription','heroTitle','heroDescription','detailBody','ctaLabel'],
  doctors:['Doctor','title','bio','seoTitle','seoDescription'],
  doctorTranslations:['DoctorTranslation','title','bio','seoTitle','seoDescription'],
  doctorMarketTranslations:['DoctorMarketTranslation','title','bio','seoTitle','seoDescription'],
  doctorFaqs:['DoctorFaq','question','answer'],
  serviceLinkTranslations:['ServiceLinkTranslation','heading','body','ctaLabel'],
  pageTranslations:['PageContentTranslation','heroTitle','heroSubtitle','heroTitleLead','heroTitleAccent','ctaLabel','intro','whoForTitle','whoForIntro','whoForItems','whyChooseTitle','whyChooseItems','faq','disclaimerParagraphs','disclaimerShort','body','seoTitle','seoDescription'],
  posts:['BlogPost','title','excerpt','body','seoTitle','seoDescription'],
  blogTranslations:['BlogTranslation','title','excerpt','content','seoTitle','seoDesc','coverImageAlt'],
  legal:['CountryLegalDocument','title','content'],
};
const rows=(state,table)=>state[table]??state.clinical[table];
export function project(state,changes) {
  const next=structuredClone(state), seen=new Set();
  for(const c of changes) {
    assert(descriptors[c.table]?.slice(1).includes(c.field),`Unexpected field ${c.table}.${c.field}`);
    const key=`${c.table}/${c.id}/${c.field}`;
    assert(!seen.has(key),`Duplicate change ${key}`); seen.add(key);
    const row=rows(next,c.table)?.find(r=>r.id===c.id); assert(row,`Missing ${key}`);
    assert.deepEqual(row[c.field],c.before,`Source drift ${key}`);
    row[c.field]=c.after;
  }
  return next;
}
export async function writeChanges(client,changes) {
  const tables=new Map();
  for(const c of changes) {
    assert(descriptors[c.table]?.slice(1).includes(c.field));
    if(!tables.has(c.table))tables.set(c.table,new Map());
    const records=tables.get(c.table);
    records.set(c.id,{...(records.get(c.id)??{id:c.id}),[c.field]:c.after});
  }
  const jsonFields=new Set(['whoForItems','whyChooseItems','faq','disclaimerParagraphs']);
  // One parameterized set update per table avoids hundreds of WAN round trips.
  for(const [key,records] of tables) {
    const values=[...records.values()],fields=[...new Set(values.flatMap(r=>Object.keys(r)))].filter(f=>f!=='id');
    const set=fields.map(f=>`"${f}"=CASE WHEN incoming.data ? '${f}' THEN incoming.data${jsonFields.has(f)?'->':'->>'}'${f}' ELSE target."${f}" END`).join(',');
    const r=await client.query(`UPDATE "${descriptors[key][0]}" AS target SET ${set},"updatedAt"=CURRENT_TIMESTAMP FROM jsonb_array_elements($1::jsonb) AS incoming(data) WHERE target.id=incoming.data->>'id'`,[JSON.stringify(values)]);
    assert.equal(r.rowCount,values.length,`Missing row in ${key}`);
  }
}
const manifestFile='content-briefs/editorial-publication-manifest-2026-09-13.json';
if(process.argv.includes('--prepare')) {
  const source=read('raw/editorial-storage-complete-before-2026-09-13.json').data;
  const groups=[['clinical','editorial-clinical-changes-2026-09-13.json'],['pages-articles','editorial-pages-articles-changes-2026-09-13.json'],['legal','editorial-legal-changes-2026-09-13.json']].map(([key,file])=>({key,changes:read(`content-briefs/${file}`)}));
  groups[0].changes.push(...read('content-briefs/editorial-service-link-changes-2026-09-13.json'));
  let state=source;
  for(const g of groups){state=project(state,g.changes);g.sha256=sha(g.changes);}
  const manifest={sourceSha256:sha(comparable(source)),groups};
  fs.writeFileSync(`${root}/${manifestFile}`,JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(`${root}/editorial-publication-authorization-2026-09-13.json`,JSON.stringify({recordedAt:new Date().toISOString(),ownerInstruction:'Yes do that',scope:'Rewrite and publish retained Romania content, including em-dash cleanup',reportedVerbalApprovals:['Dr. Thiago','Dr. Robert'],provenance:'Super admin reported verbal clinician approval and authorized drafting/publication in this task. This is not a claim that either clinician directly reviewed each final sentence.',manifestSha256:sha(manifest),groups:groups.map(g=>({key:g.key,sha256:g.sha256}))},null,2)+'\n');
  const states=romanianContentStates(state.clinical), previous=romanianContentStates(source.clinical);
  const committed=execFileSync('git',['show','HEAD:backend/src/content/romania-clinical-review.ts'],{encoding:'utf8'});
  const allowed=JSON.parse(committed.match(/export const APPROVED_ROMANIA_STATES: Record<string, string\[\]> = (\{[\s\S]*?\n\});/)[1]);
  for(const [key,value] of Object.entries(states))if(value!==previous[key])allowed[key]=[...new Set([...(allowed[key]??[]),value])];
  const codeFile='backend/src/content/romania-clinical-review.ts',code=fs.readFileSync(codeFile,'utf8');
  fs.writeFileSync(codeFile,code.replace(/export const APPROVED_ROMANIA_STATES: Record<string, string\[\]> = \{[\s\S]*?\n\};/,`export const APPROVED_ROMANIA_STATES: Record<string, string[]> = ${JSON.stringify(allowed,null,2)};`));
  console.log(JSON.stringify({groups:groups.map(g=>({key:g.key,fields:g.changes.length})),manifestSha256:sha(manifest)}));
} else if(process.argv[1]?.endsWith('apply-romania-editorial.mjs')) {
  const manifest=read(manifestFile),authorization=read('editorial-publication-authorization-2026-09-13.json');
  assert.equal(sha(manifest),authorization.manifestSha256,'Authorized manifest changed');
  let expected=read('raw/editorial-storage-complete-before-2026-09-13.json').data;
  assert.equal(sha(comparable(expected)),manifest.sourceSha256);
  const apply=process.argv.includes('--apply'),rehearse=process.argv.includes('--rehearse');
  const key=process.argv.find(a=>a.startsWith('--group='))?.slice(8);
  const group=manifest.groups.find(g=>g.key===key);
  if(!rehearse)assert(group,'Unknown group');
  if(apply){assert.equal(process.argv.find(a=>a.startsWith('--confirm='))?.slice(10),group.sha256);assert.equal(read('editorial-backend-deployment-2026-09-13.json').status,'SUCCESS');}
  if(!rehearse)for(const prior of manifest.groups.slice(0,manifest.groups.indexOf(group))){assert.equal(read(`raw/editorial-rollout/${prior.key}-applied.json`).publicVerified,true);expected=project(expected,prior.changes);}
  const selected=rehearse?manifest.groups:[group],client=await connect();
  fs.mkdirSync(`${root}/raw/editorial-rollout`,{recursive:true});
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const before=await readEditorial(client);
    assert.deepEqual(comparable(before),comparable(expected),'Storage drift; reconcile before editing');
    let desired=expected;
    for(const g of selected){desired=project(desired,g.changes);assertRomaniaClinicalChanges(expected.clinical,desired.clinical);await writeChanges(client,g.changes);expected=desired;}
    const after=await readEditorial(client);assert.deepEqual(comparable(after),comparable(desired),'Protected-state mismatch');
    if(apply){
      fs.writeFileSync(`${root}/raw/editorial-rollout/${key}-before.json`,JSON.stringify({checkedAt:new Date().toISOString(),data:before},null,2)+'\n',{flag:'wx'});
      await client.query('COMMIT');
      fs.writeFileSync(`${root}/raw/editorial-rollout/${key}-applied.json`,JSON.stringify({key,appliedAt:new Date().toISOString(),sha256:group.sha256,fields:group.changes.length,publicVerified:false,afterSha256:sha(comparable(after))},null,2)+'\n');
      fs.appendFileSync('docs/plans/seo-control-state.md',`\n- Romania editorial batch ${key}: saved; public readback pending. Evidence: seo/romania/raw/editorial-rollout/${key}-applied.json.\n`);
    } else {
      await client.query('ROLLBACK');
      assert.deepEqual(comparable(await readEditorial(client)),comparable(before),'Rollback mismatch');
      fs.writeFileSync(`${root}/raw/editorial-rollout/rehearsal.json`,JSON.stringify({checkedAt:new Date().toISOString(),manifestSha256:sha(manifest),groups:selected.map(g=>g.key),fields:selected.reduce((n,g)=>n+g.changes.length,0),rolledBack:true},null,2)+'\n');
    }
    console.log(JSON.stringify({applied:apply,rolledBack:!apply,groups:selected.map(g=>g.key)}));
  } catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message.split('\n')[0]);process.exitCode=1;}finally{await client.end();}
}
