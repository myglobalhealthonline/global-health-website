#!/usr/bin/env node
/**
 * Repeatable public-endpoint probe (perf plan docs/plans/new.md §9.5).
 *
 * Read-only anonymous GETs, the same requests a visitor's browser makes. It
 * records per-request timings and sizes so a "before" run and an "after" run
 * are comparable, and writes every raw sample alongside the summary — the
 * audit's original seven-sample probe could not establish a tail percentile,
 * so nothing here reports an average on its own.
 *
 *   node probe.mjs --base https://api.myglobalhealth.online --samples 30
 *
 * Flags: --base <origin>  --site <origin>  --samples <n>  --warmup <n>  --out <file>
 *
 * Percentiles use the nearest-rank method. With n samples the highest
 * percentile that is not simply the maximum is (1 - 1/n); n=30 therefore
 * supports p95 only as a directional figure. Label it as such.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const API = flag("base", "https://api.myglobalhealth.online").replace(/\/$/, "");
// `www` and the country SLUG, both deliberate. The apex host 301s to www, and
// `/ie/en` (the country CODE) is an accepted alias — probing either one adds a
// redirect hop or measures a URL real visitors and the sitemap do not use.
// The API keeps the country code, which is what its route parameter takes.
const SITE = flag("site", "https://www.myglobalhealth.online").replace(/\/$/, "");
const SAMPLES = Number(flag("samples", "30"));
const WARMUP = Number(flag("warmup", "3"));
const OUT = flag("out", join(dirname(fileURLToPath(import.meta.url)), "samples.json"));

const TARGETS = [
  { name: "api:doctors", url: `${API}/api/countries/ie/doctors?locale=EN` },
  { name: "api:services", url: `${API}/api/countries/ie/services?locale=EN` },
  { name: "api:doctor-cards", url: `${API}/api/countries/ie/doctor-cards?locale=EN` },
  { name: "api:service-cards", url: `${API}/api/countries/ie/service-cards?locale=EN` },
  { name: "api:health", url: `${API}/health` },
  { name: "site:ireland-home", url: `${SITE}/ireland/en` },
];

/** One request. Returns timings in ms and both wire and decoded sizes. */
async function probe(url) {
  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(url, {
      headers: { "accept-encoding": "gzip, br", "user-agent": "gh-perf-probe/1" },
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
  const ttfbMs = performance.now() - startedAt;
  const body = await response.arrayBuffer();
  const totalMs = performance.now() - startedAt;
  return {
    ok: true,
    status: response.status,
    ttfbMs: Number(ttfbMs.toFixed(1)),
    totalMs: Number(totalMs.toFixed(1)),
    // Decoded size. `content-length` is the compressed size when the server
    // set it; both are recorded because the plan's budget is a compressed one.
    decodedBytes: body.byteLength,
    wireBytes: Number(response.headers.get("content-length")) || null,
    contentEncoding: response.headers.get("content-encoding"),
    cacheControl: response.headers.get("cache-control"),
    serverTiming: response.headers.get("server-timing"),
  };
}

/** Nearest-rank percentile — the same method the audit used. */
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

function describe(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, v) => sum + v, 0) / (sorted.length || 1);
  const variance =
    sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (sorted.length || 1);
  return {
    n: sorted.length,
    min: sorted[0] ?? null,
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? null,
    mean: Number(mean.toFixed(1)),
    stdDev: Number(Math.sqrt(variance).toFixed(1)),
  };
}

const results = {};
for (const target of TARGETS) {
  // Warm-ups are discarded, never silently folded into the reported set.
  for (let i = 0; i < WARMUP; i += 1) await probe(target.url);
  const samples = [];
  for (let i = 0; i < SAMPLES; i += 1) samples.push(await probe(target.url));
  const okSamples = samples.filter((s) => s.ok && s.status < 400);
  results[target.name] = {
    url: target.url,
    samples,
    errorRate: Number(((samples.length - okSamples.length) / samples.length).toFixed(3)),
    statuses: [...new Set(samples.map((s) => s.status ?? s.error))],
    ttfbMs: describe(okSamples.map((s) => s.ttfbMs)),
    totalMs: describe(okSamples.map((s) => s.totalMs)),
    decodedBytes: okSamples[0]?.decodedBytes ?? null,
    wireBytes: okSamples[0]?.wireBytes ?? null,
    contentEncoding: okSamples[0]?.contentEncoding ?? null,
    serverTiming: okSamples[0]?.serverTiming ?? null,
  };
  const t = results[target.name].totalMs;
  console.log(
    `${target.name.padEnd(20)} n=${t.n} p50=${t.p50}ms p95=${t.p95}ms max=${t.max}ms ` +
      `bytes=${results[target.name].decodedBytes} enc=${results[target.name].contentEncoding} ` +
      `status=${results[target.name].statuses.join(",")}`,
  );
}

const artifact = {
  capturedAt: new Date().toISOString(),
  api: API,
  site: SITE,
  samples: SAMPLES,
  warmupDiscarded: WARMUP,
  node: process.version,
  note:
    "Sequential single-connection samples from one developer machine over the public internet. " +
    "Network variance is included in every figure; use this only to compare against a run made " +
    "the same way from the same place. p95 at n=30 is directional.",
  results,
};
writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`\nwrote ${OUT}`);
