// Exact approved row updates, one service/doctor group per serializable transaction.
// Credentials come from established process configuration, never the manifest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { connect, readRomania } from './romania-seo-storage.mjs';
import { hash, rehearse } from './prepare-romania-seo.mjs';
import { assertRomaniaClinicalChanges } from '../src/content/romania-clinical-review.ts';

const tables = { services: 'Service', serviceTranslations: 'ServiceTranslation', serviceFaqs: 'ServiceFaq', serviceFaqTranslations: 'ServiceFaqTranslation', doctorMarketTranslations: 'DoctorMarketTranslation', doctorFaqs: 'DoctorFaq', serviceLinks: 'ServiceLink' };
const updateFields = { services: ['seoTitle','seoDescription','heroTitle','detailBody'], serviceTranslations: ['seoTitle','seoDescription','heroTitle','detailBody'], doctorMarketTranslations: ['seoTitle'], doctorFaqs: ['question','answer'], serviceLinks: ['isActive'] };
const insertFields = { serviceFaqs: ['id','serviceId','question','answer','sortOrder','isVisible'], serviceFaqTranslations: ['id','serviceFaqId','locale','question','answer'] };
export function comparable(value) {
  if (Array.isArray(value)) return value.map(comparable).sort((a,b) => String(a?.id ?? JSON.stringify(a)).localeCompare(String(b?.id ?? JSON.stringify(b))));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter(k => !['updatedAt','createdAt','checkedAt'].includes(k)).sort().map(k => [k, comparable(value[k])]));
  return value;
}
export function verifyApproval(manifest, approval, key) {
  assert.equal(hash(manifest), approval.manifestSha256, 'Approved manifest changed');
  assert.equal(approval.reviewerDoctorId, 'cmrc4axni00rn01p2n3r2bopf');
  assert.equal(approval.reviewerName, 'Dr Robert Gabriel Brindus');
  assert.equal(approval.evidenceType, 'owner-reported clinician approval in this task');
  const group = manifest.groups.find(g => g.key === key);
  assert(group, 'Unknown group');
  assert.equal(approval.groups.find(g => g.key === key)?.approvedSha256, group.approvalSha256, 'Exact group approval missing');
  assert.equal(manifest.blockers.length, 0, 'Manifest has source blockers');
  return group;
}
export async function mutateGroup(client, group) {
  return mutateRows(client, group, tables, updateFields, insertFields);
}

// Country runners supply fixed, reviewed table/column allowlists; values remain parameters.
export async function mutateRows(client, group, tables, updateFields, insertFields) {
  for (const op of group.changes) {
    const table = tables[op.table];
    assert(table, 'Unapproved table');
    const keys = Object.keys(op.after), allowed = op.action === 'insert' ? insertFields[op.table] : updateFields[op.table];
    assert(allowed && keys.every(k => allowed.includes(k)), 'Unapproved field');
    let result;
    if (op.action === 'insert') {
      result = await client.query(`INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(',')}, "createdAt", "updatedAt") VALUES (${keys.map((_,i) => `$${i+1}`).join(',')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, keys.map(k => op.after[k]));
    } else {
      assert.equal(op.action, 'update');
      result = await client.query(`UPDATE "${table}" SET ${keys.map((k,i) => `"${k}"=$${i+1}`).join(',')}, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$${keys.length+1}`, [...keys.map(k => op.after[k]), op.id]);
    }
    assert.equal(result.rowCount, 1, `Row count mismatch: ${table}/${op.id}`);
  }
}

if (process.argv[1]?.endsWith('apply-romania-seo.mjs')) {
  const arg = name => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length+3);
  const root = 'seo/romania', read = f => JSON.parse(fs.readFileSync(path.join(root,f), 'utf8'));
  const manifest = read('content-briefs/storage-mutation-manifest-2026-09-13.json');
  const approval = read('clinical-approval-2026-09-13.json');
  const key = arg('group');
  const group = verifyApproval(manifest, approval, key);
  const apply = process.argv.includes('--apply');
  if (apply) {
    assert.equal(arg('confirm'), group.approvalSha256, 'Confirmation must match approved group');
    assert(read('enforcement-deployment-2026-09-13.json').deploymentId, 'Deployed mutation-boundary enforcement receipt required');
  }
  const folder = path.join(root, 'raw', 'rollout');
  fs.mkdirSync(folder, { recursive: true });
  const stem = group.key.replaceAll(':','-');
  let expected = read('raw/storage-preflight-with-links-2026-09-13.json').data;
  for (const prior of manifest.groups.slice(0, manifest.groups.indexOf(group))) {
    const receipt = read(`raw/rollout/${prior.key.replaceAll(':','-')}-applied.json`);
    assert.equal(receipt.approvalSha256, prior.approvalSha256, 'Prior batch approval changed');
    assert.equal(receipt.publicVerified, true, 'Prior batch needs public readback before continuing');
    expected = rehearse(expected, prior);
  }
  const desired = rehearse(expected, group);
  assertRomaniaClinicalChanges(expected, desired);
  const client = await connect();
  try {
    await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (apply) {
      // Lock each existing target. Predicate reads below protect new-row/association races under SERIALIZABLE.
      for (const op of group.changes.filter(c => c.action === 'update')) {
        await client.query(`SELECT id FROM "${tables[op.table]}" WHERE id=$1 FOR UPDATE`, [op.id]);
      }
    }
    const before = await readRomania(client);
    const alreadyApplied = JSON.stringify(comparable(before)) === JSON.stringify(comparable(desired));
    if (!alreadyApplied) assert.deepEqual(comparable(before), comparable(expected), 'Storage drift; stop and reconcile, do not overwrite');
    if (!apply) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify({ group:key, dryRun:true, alreadyApplied, operations:group.changes.length, approvalSha256:group.approvalSha256 }));
    } else {
      const backupPath = path.join(folder, `${stem}-before.json`);
      if (!alreadyApplied) {
        if (fs.existsSync(backupPath)) assert.deepEqual(comparable(JSON.parse(fs.readFileSync(backupPath)).data), comparable(before), 'Existing rollback snapshot mismatch');
        else fs.writeFileSync(backupPath, JSON.stringify({ checkedAt:new Date().toISOString(), approvalSha256:group.approvalSha256, data:before }, null, 2)+'\n', { flag:'wx', mode:0o600 });
        await mutateGroup(client, group);
      }
      const after = await readRomania(client);
      assert.deepEqual(comparable(after), comparable(desired), 'Post-write row or protected-state mismatch');
      assertRomaniaClinicalChanges(before, after);
      await client.query('COMMIT');
      const receiptPath = path.join(folder, `${stem}-applied.json`);
      const previous = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath)) : {};
      fs.writeFileSync(receiptPath, JSON.stringify({ ...previous, group:key, approvalSha256:group.approvalSha256, reviewerDoctorId:approval.reviewerDoctorId, approvalEvidence:approval.evidenceType, appliedAt:previous.appliedAt??new Date().toISOString(), alreadyApplied, operations:group.changes.length, publicVerified:previous.publicVerified??false, afterSha256:hash(comparable(after)) }, null, 2)+'\n');
      const ledgerPath = 'docs/plans/seo-control-state.md';
      const ledger = fs.readFileSync(ledgerPath, 'utf8');
      if (!ledger.includes(`- Romania rollout \`${key}\`:`)) fs.appendFileSync(ledgerPath, `\n- Romania rollout \`${key}\`: database saved; public readback pending. Receipt: \`seo/romania/raw/rollout/${stem}-applied.json\`.\n`);
      console.log(JSON.stringify({ group:key, committed:true, alreadyApplied, receipt:receiptPath }));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // Assertion values contain clinical copy; the redacted message is enough for CLI diagnostics.
    console.error(error.message.split('\n')[0]);
    process.exitCode = 1;
  } finally { await client.end(); }
}
