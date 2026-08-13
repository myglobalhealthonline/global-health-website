import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";

// k6's JS engine has no native JSON module loader — config is read via
// open()+JSON.parse in init context instead of `import x from "./x.json"`.
const targets = JSON.parse(open("../config/targets.json"));

// secrets.json is gitignored; falls back to env vars so CI/other machines
// don't need the file. See loadtest/README.md.
let secrets = {};
try {
  secrets = JSON.parse(open("../config/secrets.json"));
} catch (e) {
  secrets = {};
}

export const FRONTEND_BASE = targets.frontendBaseUrl;
export const BACKEND_BASE = targets.backendBaseUrl;
export const PROXY_SECRET =
  secrets.proxyClientIpSecret || __ENV.PROXY_CLIENT_IP_SECRET || "";

// Every request gets a bounded timeout. Without this, one stalled TCP
// connection can hang a VU indefinitely (observed once during suite
// development: a single request stretched to 1h51m and dragged the whole
// run's wall-clock and percentile stats down with it). 30s is generous
// against the ~300-900ms normal response times seen in manual testing —
// wide enough to not falsely flag a legitimately slow PDF/export call, tight
// enough to fail fast on a genuine hang.
export const REQUEST_TIMEOUT = "30s";

// One synthetic IP per VU so each virtual user gets its own rate-limit
// bucket, matching how the backend keys on x-gh-client-ip when a valid
// x-gh-proxy-secret is presented (backend/src/utils/rate-limit-trust.ts).
export function syntheticIpForVu() {
  const vu = __VU || 1;
  const a = 10;
  const b = (vu >> 16) & 0xff;
  const c = (vu >> 8) & 0xff;
  const d = vu & 0xff;
  return `${a}.${b}.${c}.${d}`;
}

// Base headers for a direct-to-backend call, tagged as trusted SSR traffic
// so the call lands in the gh-ssr bucket instead of the public default.
export function backendHeaders(extra) {
  const headers = {
    "x-gh-client-ip": syntheticIpForVu(),
    "x-gh-proxy-secret": PROXY_SECRET,
  };
  return Object.assign(headers, extra || {});
}

// Cookie pool minted once by scripts/mint-load-test-cookies.mjs and checked
// in as config/cookies.json (gitignored). Each entry: { role, email, cookie }.
const cookiePool = new SharedArray("cookies", function () {
  try {
    return JSON.parse(open("../config/cookies.json"));
  } catch (e) {
    return [];
  }
});

export function cookiesForRole(role) {
  const matches = cookiePool.filter((c) => c.role === role);
  if (matches.length === 0) return null;
  const idx = (__VU || 1) % matches.length;
  return matches[idx];
}

export function authHeaders(role, extra) {
  const identity = cookiesForRole(role);
  const headers = backendHeaders(extra);
  if (identity) {
    headers["Cookie"] = identity.cookie;
  }
  return headers;
}

// Params for an authenticated GET where 401 (expired/absent cookie in the
// small mint pool) is an accepted-but-flagged outcome, not a server fault —
// keeps k6's built-in http_req_failed metric meaningful instead of every
// pool-exhaustion 401 inflating it.
export function authGetParams(role, name, extra) {
  return {
    headers: authHeaders(role, extra),
    tags: { name },
    timeout: REQUEST_TIMEOUT,
    responseCallback: http.expectedStatuses(200, 401),
  };
}

// Params for an unauthenticated backend call (public reads, gp-assign,
// cart writes gated only by the proxy-secret contract).
export function backendParams(name, extra, headerExtra) {
  return {
    headers: backendHeaders(headerExtra),
    tags: { name },
    timeout: REQUEST_TIMEOUT,
    ...(extra || {}),
  };
}

export function checkStatus(res, expected, label) {
  const list = Array.isArray(expected) ? expected : [expected];
  return check(res, {
    [`${label || res.url}: status in ${list.join(",")}`]: (r) =>
      list.includes(r.status),
  });
}

// Small helper for pacing writes so a single VU never approaches a tight
// per-route bucket (e.g. booking 5/h, checkout 20/h) even under a long soak.
export function think(minSeconds, maxSeconds) {
  const s = minSeconds + Math.random() * (maxSeconds - minSeconds);
  return s;
}

export const http_ = http;
