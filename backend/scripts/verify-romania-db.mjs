// Approved payload rehearsal on real PostgreSQL. Always rolls back; never commits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { connect, readRomania } from './romania-seo-storage.mjs';
import { comparable, mutateGroup, verifyApproval } from './apply-romania-seo.mjs';
import { rehearse } from './prepare-romania-seo.mjs';
import { assertRomaniaClinicalChanges } from '../src/content/romania-clinical-review.ts';
const read = p => JSON.parse(fs.readFileSync(`seo/romania/${p}`, 'utf8'));
const manifest = read('content-briefs/storage-mutation-manifest-2026-09-13.json');
const approval = read('clinical-approval-2026-09-13.json');
const client = await connect();
try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const before = await readRomania(client);
  assert.deepEqual(comparable(before), comparable(read('raw/storage-preflight-with-links-2026-09-13.json').data), 'Source drift');
  await client.query('SAVEPOINT atomicity_probe');
  await mutateGroup(client, manifest.groups.find(g => g.key.startsWith('service:')));
  await client.query('ROLLBACK TO SAVEPOINT atomicity_probe');
  assert.deepEqual(comparable(await readRomania(client)), comparable(before), 'Savepoint rollback failed');
  let expected = before;
  for (const group of manifest.groups) {
    verifyApproval(manifest, approval, group.key);
    const next = rehearse(expected, group);
    assertRomaniaClinicalChanges(expected, next);
    await mutateGroup(client, group);
    assert.deepEqual(comparable(await readRomania(client)), comparable(next), `Real PostgreSQL mismatch: ${group.key}`);
    expected = next;
  }
  await client.query('ROLLBACK');
  assert.deepEqual(comparable(await readRomania(client)), comparable(before), 'Full rollback failed');
  fs.writeFileSync('seo/romania/raw/postgres-rehearsal-2026-09-13.json', JSON.stringify({ checkedAt:new Date().toISOString(), groups:manifest.groups.length, operations:manifest.groups.reduce((n,g)=>n+g.changes.length,0), savepointRollbackVerified:true, fullRollbackVerified:true, committed:false }, null, 2)+'\n');
  console.log('PASS: 20 groups / 591 real PostgreSQL operations; savepoint and full rollback verified. Nothing committed.');
} catch (e) {
  await client.query('ROLLBACK').catch(()=>{});
  console.error(e.message.split('\n')[0]); process.exitCode=1;
} finally { await client.end(); }
