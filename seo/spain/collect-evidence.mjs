// Read-only Spain collection; preserve dated responses and follow observed market links.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parse } from '../romania/collect-public-inventory.mjs';
const root = 'seo/spain/raw', origin = 'https://www.myglobalhealth.online';
const hash = v => createHash('sha256').update(v).digest('hex');
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
  return { url, status: r.status, finalUrl: r.url, checkedAt: new Date().toISOString(), html: await r.text() };
}
async function save(file, value) { await fs.writeFile(`${root}/${file}`, JSON.stringify(value, null, 2)); }
await fs.mkdir(`${root}/html`, { recursive: true });
await fs.mkdir(`${root}/api`, { recursive: true });
const sitemap = await get(`${origin}/sitemap.xml`); assert.equal(sitemap.status, 200);
await fs.writeFile(`${root}/sitemap-2026-09-13.xml`, sitemap.html);
const urls = [...new Set([...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]).filter(u => u.startsWith(`${origin}/spain/`)))];
assert(urls.length > 0);
await save('sitemap-urls.json', urls);
const seen = new Set(urls), pages = [];
async function collect(batch, discovery) {
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < batch.length) {
      const url = batch[next++], file = `html/${hash(url).slice(0, 20)}.json`;
      try {
        let r; try { r = JSON.parse(await fs.readFile(`${root}/${file}`, 'utf8')); } catch { r = await get(url); await save(file, r); }
        pages.push({ ...parse(r.html, url), status: r.status, finalUrl: r.finalUrl, checkedAt: r.checkedAt, discovery });
      } catch (e) { pages.push({ url, discovery, error: e.message }); }
      if (pages.length % 40 === 0) console.log(`Collected ${pages.length} Spain URLs`);
    }
  }));
}
await collect(urls, 'sitemap');
for (;;) {
  const linked = [];
  for (const p of pages) for (const a of p.links ?? []) {
    let u; try { u = new URL(a.href, p.url); } catch { continue; }
    if (u.origin !== origin || !u.pathname.startsWith('/spain/') || /\.(pdf|png|jpg|svg)$/i.test(u.pathname)) continue;
    u.search = ''; u.hash = ''; const url = u.href.replace(/\/$/, '');
    if (!seen.has(url)) { seen.add(url); linked.push(url); }
  }
  if (!linked.length) break;
  await collect(linked, 'internal link');
}
pages.sort((a,b) => a.url.localeCompare(b.url));
await save('public-inventory-2026-09-13.json', pages);
const endpoints = new Map();
for (const p of pages) {
  const [,country,locale,kind,slug] = new URL(p.url).pathname.split('/');
  if (!['en','es','cs','de','ro','pt'].includes(locale)) continue;
  for (const k of ['doctors','services']) endpoints.set(`${k}-${locale.toUpperCase()}`, `/api/countries/es/${k}?locale=${locale.toUpperCase()}`);
  if (['doctors','services'].includes(kind) && slug) endpoints.set(`${kind}-${slug}-${locale.toUpperCase()}`, kind === 'services' ? `/api/services/${slug}?countryCode=es&locale=${locale.toUpperCase()}` : `/api/countries/es/doctors/${slug}?locale=${locale.toUpperCase()}`);
}
let next = 0; const jobs = [...endpoints];
await Promise.all(Array.from({length:4},async()=>{while(next<jobs.length){const [name,endpoint]=jobs[next++];const r=await get(`https://api.myglobalhealth.online${endpoint}`);let body;try{body=JSON.parse(r.html)}catch{body={error:'Non-JSON response'}}await save(`api/${name}.json`,{endpoint,checkedAt:r.checkedAt,status:r.status,...body});}}));
console.log(JSON.stringify({pages:pages.length,api:jobs.length,errors:pages.filter(p=>p.error).length,statuses:pages.reduce((a,p)=>(a[p.status]=(a[p.status]??0)+1,a),{})}));
