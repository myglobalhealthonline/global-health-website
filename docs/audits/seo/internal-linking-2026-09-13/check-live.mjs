import fs from 'node:fs/promises';
import { parse } from '../../../../seo/romania/collect-public-inventory.mjs';
const dir = new URL('./', import.meta.url);
const urls = JSON.parse(await fs.readFile(new URL(process.argv[2] ?? 'seed-urls.json', dir), 'utf8'));
const output = process.argv[3] ?? 'live-pages.json';
const results = [];
let next = 0;
await Promise.all(Array.from({length: 4}, async () => {
  while(next < urls.length) {
    const url = urls[next++];
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(30000)});
      const p = parse(await r.text(), url);
      results.push({...p, status:r.status, finalUrl:r.url, xRobotsTag:r.headers.get('x-robots-tag'), checkedAt:new Date().toISOString()});
    } catch(e) { results.push({url, error:e.message}); }
  }
}));
await fs.writeFile(new URL(output, dir), JSON.stringify(results, null, 2));
console.log(JSON.stringify({pages:results.length,errors:results.filter(r=>r.error),non200:results.filter(r=>r.status!==200).map(r=>({url:r.url,status:r.status}))}));
