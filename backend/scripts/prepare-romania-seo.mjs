// Read-only planner. Publication is held on the ledger's clinical approval and
// mutation-boundary enforcement requirements. This file intentionally has no DB writer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const locales = ['CS', 'DE', 'EN', 'ES', 'PT', 'RO'];
const fields = ['seoTitle', 'seoDescription', 'heroTitle', 'detailBody'];
const pick = (row, keys) => Object.fromEntries(keys.map(k => [k, row[k]]));
const equal = (a, b, message) => assert.deepEqual(a, b, message);
const one = (rows, predicate, message) => {
  const found = rows.filter(predicate);
  assert.equal(found.length, 1, message);
  return found[0];
};

export function prepareRomania(snapshot, serviceDrafts, doctorDrafts, publicRefresh, sourceFor) {
  const s = snapshot.data, groups = [], blockers = [];
  equal([...s.countryLocales.map(l => l.locale)].sort(), locales, 'Unexpected country locales');
  assert.equal(s.country.defaultLocale, 'RO', 'Base FAQ language changed');
  assert.equal(s.country.code, 'ro');
  const update = (table, row, data) => {
    const changed = Object.keys(data).filter(k => row[k] !== data[k]);
    return changed.length ? [{ action: 'update', table, id: row.id, before: structuredClone(row), after: pick(data, changed) }] : [];
  };
  const checkSource = d => {
    const saved = sourceFor(d), current = one(publicRefresh.results, r => r.url === d.url, `Missing fresh source ${d.url}`);
    assert.equal(hash(saved), d.sourceFingerprint, `Saved source fingerprint: ${d.url}`);
    assert.equal(hash(current.data), d.sourceFingerprint, `Public source drift: ${d.url}; reconcile before planning`);
    return saved;
  };
  const add = (key, drafts, build) => {
    try {
      const changes = build();
      groups.push({ key, transaction: 'one SERIALIZABLE transaction; reread and compare source rows before any mutation',
        urls: drafts.map(d => d.url), approvalSha256: hash({ key, payloads: drafts.map(d => ({ url: d.url, after: d.after, faqPatches: d.faqPatches })), changes }), changes });
    } catch (error) { blockers.push({ key, reason: error.message }); }
  };

  for (const slug of [...new Set(serviceDrafts.map(d => d.slug))]) {
    const drafts = serviceDrafts.filter(d => d.slug === slug).sort((a,b) => a.locale.localeCompare(b.locale));
    add(`service:${slug}`, drafts, () => {
      equal(drafts.map(d => d.locale.toUpperCase()).sort(), locales, `${slug}: migrate all six locales together`);
      assert.notEqual(slug, 'evaluare-durere', 'Unstaffed service must remain held');
      const base = one(s.services, v => v.slug === slug, `Ambiguous service ${slug}`);
      assert(base.isActive && base.visibility === 'PUBLIC', `${slug}: publication state changed`);
      const assigned = s.assignments.filter(a => a.serviceId === base.id && a.isActive && a.status === 'active');
      assert(assigned.length > 0, `${slug}: no approved assignment`);
      for (const a of assigned) {
        const doc = one(s.doctors, d => d.id === a.doctorId, 'Missing assigned doctor');
        assert(doc.active, `${slug}: inactive doctor`);
        equal(doc.languages, ['Romanian', 'English'], `${slug}: consultation languages changed`);
      }
      assert(!s.serviceFaqs.some(f => f.serviceId === base.id), `${slug}: existing native FAQs require reconciliation`);
      const changes = [];
      for (const d of drafts) {
        const source = checkSource(d);
        assert.equal(source.id, base.id);
        equal(source.faqs, [], `${slug}: unexpected public FAQs`);
        const row = one(s.serviceTranslations, t => t.serviceId === base.id && t.locale === d.locale.toUpperCase(), `${slug}: missing locale row`);
        equal(pick(row, fields), pick(d.before, fields), `${d.url}: stored translation drift/fallback`);
        assert.equal(d.after.faqs.length, 4);
        assert.equal(d.after.detailBody + d.removedEmbeddedSection, d.before.detailBody, `${d.url}: nonterminal FAQ removal or body rewrite`);
        changes.push(...update('serviceTranslations', row, pick(d.after, fields)));
      }
      const ro = drafts.find(d => d.locale === 'ro');
      equal(pick(base, fields), pick(ro.before, fields), `${slug}: base copy differs from RO; reconcile fallback`);
      changes.push(...update('services', base, pick(ro.after, fields)));
      for (let index = 0; index < 4; index++) {
        const id = `ro-seo-${hash({ serviceId: base.id, payload: drafts.map(d => d.after.faqs), index }).slice(0,32)}`;
        changes.push({ action: 'insert', table: 'serviceFaqs', id, after: { id, serviceId: base.id, ...ro.after.faqs[index], sortOrder: index, isVisible: true } });
        for (const d of drafts) {
          const translationId = `${id}-${d.locale}`;
          changes.push({ action: 'insert', table: 'serviceFaqTranslations', id: translationId,
            after: { id: translationId, serviceFaqId: id, locale: d.locale.toUpperCase(), ...d.after.faqs[index] } });
        }
      }
      return changes;
    });
  }

  for (const slug of [...new Set(doctorDrafts.map(d => d.slug))]) {
    const drafts = doctorDrafts.filter(d => d.slug === slug);
    add(`doctor:${slug}`, drafts, () => {
      equal(drafts.map(d => d.locale.toUpperCase()).sort(), locales, `${slug}: incomplete locale set`);
      const doc = one(s.doctors, d => d.slug === slug, `Ambiguous doctor ${slug}`);
      assert.equal(doc.countryId, s.country.id, `${slug}: primary market changed`);
      assert(s.doctorCountries.filter(c => c.doctorId === doc.id).every(c => c.countryId === s.country.id), `${slug}: shared cross-country FAQ impact`);
      const market = one(s.doctorCountries, c => c.doctorId === doc.id && c.countryId === s.country.id, 'Missing market association');
      assert(market.active && doc.active, `${slug}: inactive doctor`);
      const changes = [];
      for (const d of drafts) {
        assert.equal(checkSource(d).id, doc.id);
        const titleRow = one(s.doctorMarketTranslations, t => t.doctorCountryId === market.id && t.locale === d.locale.toUpperCase(), `${slug}: market title ownership changed`);
        assert.equal(titleRow.seoTitle, d.before.seoTitle, `${slug}: title drift`);
        changes.push(...update('doctorMarketTranslations', titleRow, d.after));
        for (const patch of d.faqPatches) {
          const faq = one(s.doctorFaqs, f => f.id === patch.id && f.doctorId === doc.id && f.locale === d.locale.toUpperCase() && f.isActive, `${slug}: FAQ association drift`);
          equal(pick(faq, ['question','answer']), patch.before, `${slug}: FAQ copy drift`);
          changes.push(...update('doctorFaqs', faq, patch.after));
        }
      }
      return changes;
    });
  }

  add('obsolete-sick-note-offer', [], () => {
    const base = one(s.services, x => x.slug === 'medic-online-romania', 'Missing general service');
    const row = one(s.serviceTranslations, x => x.serviceId === base.id && x.locale === 'EN', 'Missing English row');
    const draft = one(serviceDrafts, x => x.slug === base.slug && x.locale === 'en', 'Missing English draft');
    const paragraph = '<p>Sick notesIf you are employed in Romania and require a sick leave certificate (concediu medical), your doctor can issue the appropriate documentation where clinically indicated. The decision to issue sick leave is always a clinical decision made by the doctor after full assessment.</p>';
    const item = '<li>Medical letters and documentation — sick notes, referral letters</li>';
    assert.equal(draft.after.detailBody.split(paragraph).length, 2, 'Sick-note paragraph drift');
    assert.equal(draft.after.detailBody.split(item).length, 2, 'Sick-note list item drift');
    const detailBody = draft.after.detailBody.replace(paragraph, '').replace(item, '<li>Medical letters and documentation: referral letters</li>');
    const link = one(s.serviceLinks, x => x.id === 'cmr8eljv4000004ju8rgmntcr' && x.sourceServiceId === base.id, 'Broken link identity drift');
    const target = s.services.find(x => x.id === link.targetServiceId);
    assert(target?.slug === 'sick-note-romania' || link.targetHref?.endsWith('/sick-note-romania'), 'Broken link target drift');
    // Preserve the original row/translations. Disabling the obsolete offer is reversible.
    return [...update('serviceTranslations', { ...row, ...pick(draft.after, fields) }, { detailBody }), ...update('serviceLinks', link, { isActive: false })];
  });
  groups.sort((a,b) => {
    const priority = k => /consultatie-pediatrie|consultatie-neurologie|dr-alexandra-palaga|dr-andreea-lorena-bica/.test(k) ? 0 : k === 'obsolete-sick-note-offer' ? 2 : 1;
    return priority(a.key) - priority(b.key) || a.key.localeCompare(b.key);
  });
  return { researchCommit: '39656572', snapshotSha256: hash(s), status: 'read-only preparation; not applied',
    publicationHolds: ['Named Romanian clinician approval of each exact payload (ledger §41.1).', 'Enforce clinical approval at all responsible content mutation boundaries (ledger §43.4); a batch-only guard is insufficient.'],
    ordering: 'Specialist services/profiles first; GENERAL/Brindus second; obsolete-sick-note-offer must follow service:medic-online-romania and uses its resulting body as before-value.',
    groups, blockers };
}

// Offline proof utility: models the manifest's all-or-nothing row semantics. It
// does not execute SQL or establish that production transaction enforcement exists.
export function rehearse(snapshot, group) {
  const next = structuredClone(snapshot);
  for (const op of group.changes) {
    const rows = next[op.table], row = rows.find(r => r.id === op.id);
    if (op.action === 'insert') {
      if (row) equal(row, op.after, `Repeat insert drift: ${op.id}`);
      else rows.push(structuredClone(op.after));
    } else {
      assert(row, `Missing row: ${op.id}`);
      if (Object.entries(op.after).every(([k,v]) => row[k] === v)) continue;
      equal(row, op.before, `Stored row drift: ${op.id}`);
      Object.assign(row, op.after);
    }
  }
  return next;
}

if (process.argv[1]?.endsWith('prepare-romania-seo.mjs')) {
  assert.equal(process.argv.length, 2, 'Read-only planner accepts no apply options');
  const root = 'seo/romania', read = file => JSON.parse(readFileSync(`${root}/${file}`, 'utf8'));
  const snapshot = read('raw/storage-preflight-with-links-2026-09-13.json');
  const plan = prepareRomania(snapshot, read('content-briefs/service-drafts.json'), read('content-briefs/doctor-drafts.json'), read('raw/implementation-public-preflight-2026-09-13.json'), d => {
    const data = read(d.source).data;
    return data.service ?? data.doctor;
  });
  writeFileSync(`${root}/content-briefs/storage-mutation-manifest-2026-09-13.json`, JSON.stringify(plan, null, 2) + '\n');
  const escape = value => String(value ?? '(null)').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const sections = plan.groups.map(group => `<details><summary>${escape(group.key)} (${group.changes.length} row operations)</summary>
    <p>Exact payload approval SHA-256: <code>${group.approvalSha256}</code></p>
    ${group.changes.map(op => `<article><h3>${escape(op.table)} / ${escape(op.id)} ${escape(op.after.locale ?? op.before?.locale ?? '')}</h3>
      <p>${op.action === 'insert' ? 'Create native FAQ row. No existing row is replaced.' : 'Update only the following fields; preserve the rest of this row.'}</p>
      ${Object.entries(op.after).filter(([key]) => op.action !== 'insert' || ['question','answer'].includes(key)).map(([key,value]) =>
        `<h4>${escape(key)}</h4><div class="diff"><div><small>Before</small><pre>${op.action === 'insert' ? '(new row)' : escape(op.before[key])}</pre></div><div><small>After</small><pre>${escape(value)}</pre></div></div>`).join('')}</article>`).join('')}</details>`).join('');
  writeFileSync(`${root}/content-briefs/implementation-review-2026-09-13.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Romania implementation review</title>
    <style>body{font:16px/1.5 system-ui,sans-serif;color:#18212a;background:#f7f8fa;max-width:1200px;margin:40px auto;padding:0 20px}h1{font-size:32px}summary{cursor:pointer;font-weight:600;padding:18px;background:#e8edf2}details{margin:16px 0;border:1px solid #ccd4dd}details>p,article{padding:0 20px}article{border-top:1px solid #ccd4dd}h3,code{overflow-wrap:anywhere}.diff{display:grid;grid-template-columns:1fr 1fr;gap:20px}.diff>div{min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 system-ui,sans-serif;background:white;padding:12px}small{font-weight:600}a{color:#154f8b}@media(max-width:700px){.diff{grid-template-columns:1fr}}</style>
    <h1>Romania implementation review</h1><p>13 September 2026. Read-only preparation from research commit 39656572. Nothing in this packet has been published.</p>
    <p>20 change groups, 591 row operations. Review each group's exact hash with one named Romanian clinician. The hash includes doctor FAQ corrections, which the original doctor review-register hashes did not cover.</p>
    <p>Publication also requires content mutation-boundary enforcement under ledger §43.4. No approval names or dates have been supplied. The current tool is a planner, not a production updater.</p>
    <p>The sick-note group follows the general-service migration; its before-value reflects that dependency. Deactivate the obsolete ServiceLink while retaining its translations for rollback. Retained clinical bodies and credentials are not certified by this review.</p>
    <p><a href="storage-mutation-manifest-2026-09-13.json">Exact manifest</a> · <a href="../implementation-preflight-2026-09-13.md">Evidence and remaining work</a></p>${sections}</html>\n`);
  console.log(JSON.stringify({ groups: plan.groups.length, operations: plan.groups.reduce((n,g) => n + g.changes.length, 0), blockers: plan.blockers, publicationHolds: plan.publicationHolds }));
  if (plan.blockers.length) process.exitCode = 1;
}
