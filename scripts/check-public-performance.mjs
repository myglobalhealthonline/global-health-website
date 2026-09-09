// Read-only post-deployment smoke gate. No booking mutations or credentials.
const origin = process.env.PERFORMANCE_ORIGIN || "https://www.myglobalhealth.online";
const routes = ["/ireland/en", "/czechia/cs", "/portugal/pt", "/spain/es", "/romania/ro", "/brazil/pt"];
let failures = 0;
for (let pass = 1; pass <= 2; pass++) {
  for (const route of routes) {
    const start = performance.now();
    try {
      const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(15000) });
      const firstByteMs = Math.round(performance.now() - start);
      const body = await response.text();
      const complete = response.status === 200 && body.includes("<main") && body.includes("</html>") && !body.includes("data-dgst=");
      if (!complete) failures++;
      console.log(JSON.stringify({ pass, route, status: response.status, complete, firstByteMs,
        totalMs: Math.round(performance.now() - start), decodedBytes: Buffer.byteLength(body),
        cacheControl: response.headers.get("cache-control"), requestId: response.headers.get("x-railway-request-id") }));
    } catch (error) {
      failures++;
      console.log(JSON.stringify({ pass, route, complete: false, error: error instanceof Error ? error.message : "Request failed" }));
    }
  }
}
process.exitCode = failures ? 1 : 0;
