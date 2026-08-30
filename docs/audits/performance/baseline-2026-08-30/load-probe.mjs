#!/usr/bin/env node
/**
 * Concurrency probe for the card projections (perf plan §16: "error rate stays
 * below 1% under the agreed load profile").
 *
 * This is NOT the k6 ladder — it is a dependency-free stand-in that answers the
 * one question the definition of done asks: under sustained concurrency, does
 * the projection path stay correct and error-free, and how does it compare with
 * the legacy path on the same data? k6 is not installed on this machine, and
 * the k6 harness is aimed at a full public traffic mix rather than these two
 * endpoints.
 *
 *   node load-probe.mjs --base http://localhost:4000 --vus 20 --seconds 20
 *
 * Point it at a NON-PRODUCTION origin. It refuses known production hosts for
 * the same reason loadtest/lib/helpers.js does.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = flag("base", "http://localhost:4000").replace(/\/$/, "");
const VUS = Number(flag("vus", "20"));
const SECONDS = Number(flag("seconds", "20"));
/** Offered requests/sec across all workers. 0 = uncapped. */
const RPS = Number(flag("rps", "40"));
const OUT = flag("out", join(dirname(fileURLToPath(import.meta.url)), "load-samples.json"));

const PRODUCTION = /myglobalhealth\.online|myglobalhealth\.up\.railway\.app/i;
if (PRODUCTION.test(BASE) && process.env.LOADTEST_ALLOW_PRODUCTION !== "1") {
  throw new Error(`Refusing to load-test production host: ${BASE}`);
}

const PATHS = [
  { name: "legacy:doctors", path: "/api/countries/ie/doctors?locale=EN" },
  { name: "proj:doctor-cards", path: "/api/countries/ie/doctor-cards?locale=EN" },
  { name: "legacy:services", path: "/api/countries/ie/services?locale=EN" },
  { name: "proj:service-cards", path: "/api/countries/ie/service-cards?locale=EN" },
];

/**
 * Real SSR traffic presents `x-gh-proxy-secret` + `x-gh-client-ip`, which the
 * backend uses to key rate limiting per ORIGINATING visitor instead of per
 * egress IP (backend/src/utils/rate-limit-trust.ts). Without them a load probe
 * measures the 300/min visitor bucket and nothing else: a first run here got
 * 97-100% 429s at ~1,300 rps, which says nothing about the endpoints.
 *
 * One synthetic IP per worker mirrors the k6 harness's `syntheticIpForVu`.
 */
const PROXY_SECRET = process.env.PROXY_CLIENT_IP_SECRET ?? "";
const headersForWorker = (worker) => ({
  "accept-encoding": "br, gzip",
  ...(PROXY_SECRET
    ? {
        "x-gh-proxy-secret": PROXY_SECRET,
        "x-gh-ssr": "1",
        "x-gh-client-ip": `10.0.${(worker >> 8) & 0xff}.${worker & 0xff}`,
      }
    : {}),
});

const pct = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null;

/** One target, VUS concurrent workers looping for SECONDS. */
async function runTarget(target) {
  const durations = [];
  const statuses = new Map();
  let errors = 0;
  let bodyMismatches = 0;
  const deadline = Date.now() + SECONDS * 1000;

  // Offered load is capped so the probe measures the ENDPOINT, not the rate
  // limiter. The SSR bucket is RATE_LIMIT_SSR_MAX/min (~50 rps by default);
  // an uncapped 20-worker loop pushed the fastest endpoint to ~870 rps and
  // got 97% 429s — correct limiter behaviour, useless as a latency signal.
  const minIntervalMs = RPS > 0 ? (1000 * VUS) / RPS : 0;

  const worker = async (workerId) => {
    while (Date.now() < deadline) {
      const cycleStart = Date.now();
      const startedAt = performance.now();
      try {
        const response = await fetch(BASE + target.path, { headers: headersForWorker(workerId) });
        const body = await response.json();
        durations.push(performance.now() - startedAt);
        statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
        if (response.status !== 200) errors += 1;
        // Correctness under load, not just liveness: every 200 must still be
        // the documented envelope with an array payload.
        else if (body?.ok !== true || !Array.isArray(body.data)) bodyMismatches += 1;
      } catch (error) {
        errors += 1;
        statuses.set(String(error?.name ?? "error"), (statuses.get("error") ?? 0) + 1);
      }
      const spent = Date.now() - cycleStart;
      if (minIntervalMs > spent) await new Promise((r) => setTimeout(r, minIntervalMs - spent));
    }
  };

  await Promise.all(Array.from({ length: VUS }, (_, i) => worker(i + 1)));
  const sorted = [...durations].sort((a, b) => a - b);
  const total = durations.length + 0;
  return {
    requests: total,
    throughputPerSec: Number((total / SECONDS).toFixed(1)),
    errors,
    errorRate: Number((errors / Math.max(1, total)).toFixed(5)),
    bodyMismatches,
    statuses: Object.fromEntries(statuses),
    p50: Number((pct(sorted, 50) ?? 0).toFixed(1)),
    p95: Number((pct(sorted, 95) ?? 0).toFixed(1)),
    p99: Number((pct(sorted, 99) ?? 0).toFixed(1)),
    max: Number((sorted[sorted.length - 1] ?? 0).toFixed(1)),
  };
}

const results = {};
for (const target of PATHS) {
  // Warm-up, discarded.
  await fetch(BASE + target.path).then((r) => r.arrayBuffer());
  results[target.name] = await runTarget(target);
  const r = results[target.name];
  console.log(
    `${target.name.padEnd(20)} n=${String(r.requests).padStart(5)} rps=${String(r.throughputPerSec).padStart(6)} ` +
      `p50=${String(r.p50).padStart(6)}ms p95=${String(r.p95).padStart(7)}ms p99=${String(r.p99).padStart(7)}ms ` +
      `errors=${r.errors} (${(r.errorRate * 100).toFixed(2)}%) badBodies=${r.bodyMismatches}`,
  );
}

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      base: BASE,
      vus: VUS,
      offeredRps: RPS,
      seconds: SECONDS,
      node: process.version,
      note:
        "Dependency-free concurrency probe against a local stack seeded with the public production catalogue. " +
        "Not a substitute for the k6 ladder against a production-like environment; it bounds error rate and " +
        "compares legacy vs projection under identical load on identical data.",
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(`\nwrote ${OUT}`);
