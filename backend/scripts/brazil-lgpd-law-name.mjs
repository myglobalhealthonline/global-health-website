// Brazil only: the trust record's EN/ES data-protection law name reads GDPR/RGPD; Brazil's law is the LGPD.
// Feeds the trust bar, homepage trust ribbon and legal page. Owner-approved 2026-09-15.
//   node --env-file=backend/.env backend/scripts/brazil-lgpd-law-name.mjs            read-only dry-run
//   node --env-file=backend/.env backend/scripts/brazil-lgpd-law-name.mjs --apply
import assert from 'node:assert/strict';
import { connect } from './romania-seo-storage.mjs';

const apply = process.argv.includes('--apply');
const WHERE = `FROM "CountryLegalProfileTrustTranslation" t
  JOIN "CountryLegalProfile" p ON p.id=t."legalProfileId" JOIN "Country" c ON c.id=p."countryId"
  WHERE c.code='br' AND t.locale::text IN ('EN','ES') AND t."dataProtectionLawName" IN ('GDPR','RGPD')`;
const client = await connect();
try {
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const { rows } = await client.query(`SELECT t.id,t.locale,t."dataProtectionLawName" ${WHERE}`);
  assert(rows.length <= 2, 'Unexpected row count');
  if (apply && rows.length) {
    const r = await client.query(`UPDATE "CountryLegalProfileTrustTranslation" SET "dataProtectionLawName"='LGPD',"updatedAt"=CURRENT_TIMESTAMP WHERE id = ANY($1::text[])`, [rows.map(x => x.id)]);
    assert.equal(r.rowCount, rows.length, 'Row count');
    const left = await client.query(`SELECT count(*)::int AS n ${WHERE}`);
    assert.equal(left.rows[0].n, 0, 'Readback');
  }
  await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', rows: rows.map(x => ({ locale: x.locale, from: x.dataProtectionLawName, to: 'LGPD' })) }));
} catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error(e.message); process.exitCode = 1; }
finally { await client.end(); }
