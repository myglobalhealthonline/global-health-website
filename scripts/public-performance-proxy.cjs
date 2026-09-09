// Local, anonymous public-GET proxy for browser verification. Never forwards
// incoming headers/cookies or any mutation. Successful public responses are
// snapshotted for deterministic functional tests, including availability.
// Never use this fixture to measure production latency or submit a booking.
// Stop with Ctrl+C after verification.
const http = require('node:http');
const prefixes = ['/api/countries','/api/public/countries','/api/doctors','/api/services','/api/specialties','/api/health-tests','/api/assets','/api/blog','/api/public/reviews-config','/api/public/consultation-count','/api/public/gp-availability','/api/public/gp-languages','/api/public/jobs','/api/public/cross-border-rx/fees'];
let mode = 'normal';
const cache = new Map();
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://127.0.0.1:4018');
  if (req.method !== 'GET') {res.writeHead(405);res.end();return;}
  if (url.pathname === '/__verification') {
    mode = ['normal','error','delay'].includes(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'normal';
    res.end(mode);return;
  }
  if (!prefixes.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix+'/'))) {
    res.writeHead(403,{'Content-Type':'application/json'});res.end('{"ok":false,"message":"Verification proxy path not allowed"}');return;
  }
  const live = /availability/.test(url.pathname);
  if (live && mode === 'error') {res.writeHead(503,{'Content-Type':'application/json'});res.end('{"ok":false}');return;}
  if (live && mode === 'delay') await new Promise(resolve => setTimeout(resolve,3000));
  try {
    const key = url.pathname+url.search;
    let entry = cache.get(key);
    if (!entry) {
      const upstream = await fetch('https://api.myglobalhealth.online'+key, {headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
      entry = {status:upstream.status,body:await upstream.text()};
      if (upstream.ok) cache.set(key,entry);
      console.log(entry.status,key);
    }
    res.writeHead(entry.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(entry.body);
  } catch {res.writeHead(503);res.end('{"ok":false}');}
}).listen(4018,'127.0.0.1',()=>console.log('Anonymous public GET proxy listening on 4018'));
