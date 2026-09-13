// Isolated PostgreSQL rehearsal of the Spain manifest. Refuses any non-local database.
// Loads the authenticated snapshot into an empty schema, rehearses every group in one
// rolled-back transaction, then commits each group through the runner's dry-run checks
// and reverses all groups with exact inverse operations. No approval is asserted.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connect} from './romania-seo-storage.mjs';
import {readSpain} from './spain-seo-storage.mjs';
import {hash,rehearse} from './prepare-spain-seo.mjs';
import {comparable,mutateRows} from './apply-romania-seo.mjs';
import {tables,updates,inserts,executeSpainGroup} from './apply-spain-seo.mjs';
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL??'postgres://missing').hostname),'Rehearsal requires an isolated local database');
const root='seo/spain',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`));
const manifest=read('content-briefs/storage-mutation-manifest.json'),snapshot=read('raw/storage-preflight-2026-09-13.json').data;
assert.equal(manifest.snapshotSha256,hash(snapshot),'Manifest/snapshot mismatch');
const source={country:'Country',countryLocales:'CountryLocale',services:'Service',serviceTranslations:'ServiceTranslation',serviceFaqs:'ServiceFaq',serviceFaqTranslations:'ServiceFaqTranslation',assignments:'ServiceDoctor',allDoctorAssignments:'ServiceDoctor',doctors:'Doctor',doctorCountries:'DoctorCountry',doctorTranslations:'DoctorTranslation',doctorMarketTranslations:'DoctorMarketTranslation',doctorFaqs:'DoctorFaq',serviceLinks:'ServiceLink',serviceLinkTranslations:'ServiceLinkTranslation'};
const same=(actual,expected,message)=>assert.deepEqual(comparable(actual),comparable(expected),message);
const client=await connect(),filled=new Set();
try{
 // Referenced non-content rows (users, payouts) are out of scope, so FK triggers are off for the load only.
 await client.query('BEGIN');await client.query('SET LOCAL session_replication_role = replica');
 const loaded=new Set();
 for(const [key,table] of Object.entries(source)){
  const {rows:cols}=await client.query(`SELECT column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,[table]);
  assert(cols.length,`Missing table ${table}`);
  for(const row of [snapshot[key]].flat()){
   if(loaded.has(`${table}:${row.id}`))continue;loaded.add(`${table}:${row.id}`);
   const values={};
   for(const c of cols){
    if(c.column_name in row){values[c.column_name]=/json/.test(c.data_type)?JSON.stringify(row[c.column_name]):row[c.column_name];continue;}
    if(c.is_nullable==='YES'||c.column_default!==null)continue;
    // Unprojected NOT NULL column: synthetic filler, never read back by the snapshot projection.
    filled.add(`${table}.${c.column_name}`);
    values[c.column_name]=c.data_type==='ARRAY'?[]:/json/.test(c.data_type)?'{}':c.data_type==='boolean'?false:/int|numeric|double|real/.test(c.data_type)?0:/timestamp|date/.test(c.data_type)?new Date().toISOString()
     :c.data_type==='USER-DEFINED'?(await client.query('SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname=$1 ORDER BY e.enumsortorder LIMIT 1',[c.udt_name])).rows[0].enumlabel:`rehearsal-${c.column_name}`;
   }
   const k=Object.keys(values);
   await client.query(`INSERT INTO "${table}" (${k.map(x=>`"${x}"`).join(',')}) VALUES (${k.map((_,i)=>`$${i+1}`).join(',')})`,k.map(x=>values[x]));
  }
 }
 await client.query('COMMIT');
 same(await readSpain(client),snapshot,'Loaded snapshot does not read back identically');

 // 1. All groups in one transaction, readback after each, savepoint failure, full rollback.
 await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');let expected=structuredClone(snapshot);
 for(const g of manifest.groups){await mutateRows(client,g,tables,updates,inserts);expected=rehearse(expected,g);same(await readSpain(client),expected,`Readback/preservation mismatch ${g.key}`);}
 await client.query('SAVEPOINT failure_test');await assert.rejects(client.query('SELECT 1/0'));await client.query('ROLLBACK TO SAVEPOINT failure_test');same(await readSpain(client),expected);
 await client.query('ROLLBACK');same(await readSpain(client),snapshot,'Rollback mismatch');

 // 2. Sequential committed groups through the runner's read-only drift/repeat checks.
 const states=[structuredClone(snapshot)];
 for(const g of manifest.groups){
  assert.equal((await executeSpainGroup(client,states.at(-1),g)).alreadyApplied,false,`Unexpected applied state ${g.key}`);
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await mutateRows(client,g,tables,updates,inserts);await client.query('COMMIT');
  states.push(rehearse(states.at(-1),g));
  assert.equal((await executeSpainGroup(client,states.at(-2),g)).alreadyApplied,true,`Repeat not detected ${g.key}`);
 }
 const probe=snapshot.services[0];
 await client.query('UPDATE "Service" SET "basePriceCents"="basePriceCents"+1 WHERE id=$1',[probe.id]);
 await assert.rejects(executeSpainGroup(client,states.at(-2),manifest.groups.at(-1)),/Storage drift/);
 await client.query('UPDATE "Service" SET "basePriceCents"=$1 WHERE id=$2',[probe.basePriceCents,probe.id]);

 // 3. Exact inverse, latest group first; refuse drift before each group.
 for(let i=manifest.groups.length-1;i>=0;i--){
  const g=manifest.groups[i];
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  same(await readSpain(client),states[i+1],`Inverse drift ${g.key}`);
  for(const c of [...g.changes].reverse()){
   const fields=Object.keys(c.after),r=c.action==='update'
    ?await client.query(`UPDATE "${tables[c.table]}" SET ${fields.map((k,j)=>`"${k}"=$${j+1}`).join(',')} WHERE id=$${fields.length+1}`,[...fields.map(k=>c.before[k]),c.id])
    :await client.query(`DELETE FROM "${tables[c.table]}" WHERE id=$1`,[c.id]);
   assert.equal(r.rowCount,1,`Inverse row count ${c.table}/${c.id}`);
  }
  same(await readSpain(client),states[i],`Inverse mismatch ${g.key}`);await client.query('COMMIT');
 }
 same(await readSpain(client),snapshot,'Inverse did not restore snapshot');
 const {rows:[{version}]}=await client.query('SELECT version()');
 const receipt={checkedAt:new Date().toISOString(),database:'isolated local PostgreSQL (embedded); production not touched',postgres:version,manifestSha256:hash(manifest),snapshotSha256:manifest.snapshotSha256,groups:manifest.groups.length,operations:manifest.groups.reduce((n,g)=>n+g.changes.length,0),snapshotReadbackIdentical:true,transactionalReadbackPerGroup:true,savepointFailureVerified:true,fullRollbackVerified:true,runnerDryRunAndRepeatDetectionPerGroup:true,protectedDriftRefused:true,exactInverseRestoredSnapshot:true,syntheticFillerColumns:[...filled].sort(),notCovered:'Clinical approval gate (synthetic tests only); updatedAt is not restored by inverse; production schema drift beyond prisma/schema.prisma.',published:false};
 fs.writeFileSync(`${root}/raw/postgres-rehearsal-${receipt.checkedAt.slice(0,10)}-${receipt.manifestSha256.slice(0,8)}.json`,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({groups:receipt.groups,operations:receipt.operations,filled:receipt.syntheticFillerColumns.length}));
}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}
