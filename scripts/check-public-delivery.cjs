// Bounded anonymous GET checks. No credentials, mutations, or booking submissions.
const assert = require('node:assert/strict');
const origin = process.env.PERFORMANCE_ORIGIN || 'http://127.0.0.1:3018';
(async () => {
  const results = [];
  for (const sample of [
    {path:'/ireland/en', kind:'HTML'},
    {path:'/ireland/en?_rsc=performance-verification', kind:'RSC', headers:{RSC:'1'}},
    {path:'/login', kind:'anonymous login'},
    {path:'/account', kind:'anonymous protected route'},
    {path:'/performance-verification-missing-page', kind:'404 document', expectedStatus:404},
  ]) {
    const response = await fetch(origin + sample.path, {
      headers:sample.headers, redirect:'manual', signal:AbortSignal.timeout(30000),
    });
    const body = await response.text();
    const cacheControl = response.headers.get('cache-control') || '';
    if (sample.expectedStatus) assert.equal(response.status, sample.expectedStatus);
    else assert.ok(response.status >= 200 && response.status < 400, `${sample.kind}: HTTP ${response.status}`);
    assert.ok(!/(?:^|,)\s*public\b|s-maxage\s*=\s*[1-9]/i.test(cacheControl), `${sample.kind}: shared document caching`);
    if (sample.kind === 'RSC') assert.match(response.headers.get('content-type') || '', /text\/x-component/);
    if (sample.kind === 'anonymous protected route') assert.ok(response.status >= 300, 'Protected route must redirect anonymous visitors');
    results.push({kind:sample.kind,status:response.status,cacheControl,vary:response.headers.get('vary'),setsCookie:response.headers.has('set-cookie'),bytes:Buffer.byteLength(body)});
  }
  console.log(JSON.stringify({passed:true,origin,scope:'Anonymous HTML/RSC/login/protected-route delivery; no authenticated-session or shared-CDN-hit claim',results},null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
