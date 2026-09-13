// Database compatibility rehearsal. Never commits; no clinical approval is asserted.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connect} from './romania-seo-storage.mjs';
import {readBrazil} from './brazil-seo-storage.mjs';
import {hash,rehearse} from './prepare-brazil-seo.mjs';
import {comparable,mutateRows} from './apply-romania-seo.mjs';
import {tables,updates,inserts} from './apply-spain-seo.mjs';
const read=p=>JSON.parse(fs.readFileSync(`seo/brazil/${p}`)),manifest=read('content-briefs/storage-mutation-manifest.json'),snapshot=read('raw/storage-preflight-2026-09-13.json').data;
assert.equal(hash(snapshot),manifest.snapshotSha256);const client=await connect();
try{await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');assert.deepEqual(comparable(await readBrazil(client)),comparable(snapshot),'Source drift');let expected=structuredClone(snapshot);
 for(const group of manifest.groups){await mutateRows(client,group,tables,updates,inserts);expected=rehearse(expected,group);assert.deepEqual(comparable(await readBrazil(client)),comparable(expected),'Readback/preservation mismatch');}
 await client.query('SAVEPOINT failure_test');let failed=false;try{await client.query('SELECT 1/0');}catch{failed=true;}assert(failed);await client.query('ROLLBACK TO SAVEPOINT failure_test');assert.deepEqual(comparable(await readBrazil(client)),comparable(expected));
 await client.query('ROLLBACK');assert.deepEqual(comparable(await readBrazil(client)),comparable(snapshot),'Rollback mismatch');
 fs.writeFileSync('seo/brazil/raw/postgres-rehearsal-2026-09-13.json',JSON.stringify({checkedAt:new Date().toISOString(),manifestSha256:hash(manifest),groups:manifest.groups.length,operations:manifest.groups.reduce((n,g)=>n+g.changes.length,0),rollbackVerified:true,savepointFailureVerified:true,published:false},null,2));console.log('All operations rehearsed; full rollback verified');
}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}
