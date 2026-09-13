// Refresh only prepared Romania source projections and representative rendered pages.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from './collect-public-inventory.mjs';
const root = 'seo/romania';
const read = p => JSON.parse(fs.readFileSync(`${root}/${p}`, 'utf8'));
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const drafts = [...read('content-briefs/service-drafts.json'), ...read('content-briefs/doctor-drafts.json')];
const results = []; let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < drafts.length) {
    const draft = drafts[next++], old = read(draft.source);
    const response = await fetch(`https://api.myglobalhealth.online${old.endpoint}`, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`${old.endpoint}: HTTP ${response.status}`);
    const body = await response.json();
    const current = body.data?.service ?? body.data?.doctor;
    if (!current) throw new Error(`Missing source: ${old.endpoint}`);
    const saved = old.data.service ?? old.data.doctor;
    results.push({ url: draft.url, endpoint: old.endpoint, checkedAt: new Date().toISOString(), sourceFingerprint: hash(current), expectedFingerprint: draft.sourceFingerprint,
      changedFields: [...new Set([...Object.keys(saved), ...Object.keys(current)])].filter(k => JSON.stringify(saved[k]) !== JSON.stringify(current[k])), data: current });
  }
}));
const pages = [];
for (const url of [...drafts.filter(d => d.locale === 'ro' && /consultatie-pediatrie|consultatie-neurologie|dr-alexandra-palaga|dr-andreea-lorena-bica/.test(d.slug)).map(d => d.url),
  'https://www.myglobalhealth.online/romania/en/services/medic-online-romania', 'https://www.myglobalhealth.online/romania/en/services/sick-note-romania']) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  pages.push({ ...parse(await response.text(), url), status: response.status, checkedAt: new Date().toISOString() });
}
fs.writeFileSync(`${root}/raw/implementation-public-preflight-2026-09-13.json`, JSON.stringify({ results: results.sort((a,b) => a.url.localeCompare(b.url)), pages }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ sources: results.length, drift: results.filter(r => r.changedFields.length).map(r => ({ url:r.url, fields:r.changedFields })), pages: pages.map(p => ({ url:p.url, status:p.status, faqCount:p.schemaFaqCount })) }));
