// Bounded anonymous Development verification. No reservations or patient data.
const assert = require('node:assert/strict');
const origin = process.env.PERFORMANCE_API_ORIGIN || 'https://backendmyglobalhealth.up.railway.app';
(async () => {
  const results = [];
  async function read(path, label) {
    const start = performance.now();
    const response = await fetch(origin + path, {signal:AbortSignal.timeout(15000)});
    const firstByteMs = Math.round(performance.now() - start);
    const body = await response.text();
    assert.equal(response.status, 200, `${label}: HTTP ${response.status}`);
    const payload = JSON.parse(body);
    assert.equal(payload.ok, true, `${label}: failed envelope`);
    results.push({label,status:response.status,firstByteMs,totalMs:Math.round(performance.now()-start),decodedBytes:Buffer.byteLength(body),cacheControl:response.headers.get('cache-control')});
    return payload.data;
  }
  const full = await read('/api/blog?countryCode=ie&locale=EN&view=full', 'blog full');
  const summary = await read('/api/blog?countryCode=ie&locale=EN&view=summary', 'blog summary');
  assert.ok(Array.isArray(full.posts) && Array.isArray(summary.posts));
  assert.ok(full.posts.length > 0, 'Need public posts to verify the summary contract');
  assert.deepEqual(summary.posts.map(post=>post.id), full.posts.map(post=>post.id));
  assert.ok(summary.posts.every(post=>!Object.hasOwn(post,'body') && Number.isInteger(post.readingTime)));
  assert.ok(results[1].decodedBytes < results[0].decodedBytes);
  await read('/api/countries/ie/services?locale=EN&mode=marketing', 'marketing services');
  await read('/api/countries/ie/doctors?locale=EN&mode=marketing', 'marketing doctors');
  for (let pass=1; pass<=2; pass++) {
    await read('/api/services/ie/acute-medical-consultation/aggregated-availability?days=14', `live availability sample ${pass}`);
    assert.match(results.at(-1).cacheControl || '', /\bno-store\b/, 'Live availability must not advertise shared caching');
  }
  console.log(JSON.stringify({passed:true,origin,scope:'Six sequential anonymous Development GETs. Availability is live; samples do not establish cold-cache behavior, p95 or field performance.',publicPosts:summary.posts.length,results},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
