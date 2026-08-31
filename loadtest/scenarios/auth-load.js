import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, backendParams, checkStatus, think } from "../lib/helpers.js";

// Same account/password-key pairing as scripts/mint-load-test-cookies.mjs —
// keep both lists in sync if the seed accounts ever change. seed-passwords.json
// is gitignored; on a machine without it (e.g. CI with no local seed run)
// CREDENTIALS is empty and the scenario sleeps instead of logging in.
const ACCOUNTS = [
  { email: "patient@globalhealthonline.com", passwordKey: "PATIENT" },
  { email: "patient2@globalhealthonline.com", passwordKey: "PATIENT2" },
  { email: "doctor@globalhealthonline.com", passwordKey: "DOCTOR" },
  { email: "doctor2@globalhealthonline.com", passwordKey: "DOCTOR2" },
  { email: "admin@globalhealthonline.com", passwordKey: "ADMIN" },
  { email: "superadmin@globalhealthonline.com", passwordKey: "SUPER_ADMIN" },
];

let passwords = {};
try {
  passwords = JSON.parse(open("../config/seed-passwords.json"));
} catch (e) {
  passwords = {};
}

const CREDENTIALS = ACCOUNTS.filter((a) => passwords[a.passwordKey]).map((a) => ({
  email: a.email,
  password: passwords[a.passwordKey],
}));

/**
 * Exercises POST /api/auth/login under load — bcrypt hashing + RS256 JWT
 * signing is exactly the CPU-bound work docs/audits/perf/
 * load-test-report-2026-08-14.md blames for the target-200 latency failure,
 * and it was never loaded in that run (the mint script only calls this 6
 * times, once, before the run starts).
 *
 * auth.route.ts rate-limits this to 10/15min per IP in production. Each VU
 * here gets its own synthetic IP (see syntheticIpForVu in lib/helpers.js),
 * but this scenario deliberately runs as a small, FIXED-rate pool (see
 * heavy_endpoints in lib/profile-builder.js for the same pattern) rather
 * than scaling with peakVUs, specifically to stay well under that limit
 * regardless of overall test size.
 */
export function authLoad() {
  if (CREDENTIALS.length === 0) {
    sleep(think(5, 10));
    return;
  }
  const cred = CREDENTIALS[Math.floor(Math.random() * CREDENTIALS.length)];
  const res = http.post(
    `${BACKEND_BASE}/api/auth/login`,
    JSON.stringify({ email: cred.email, password: cred.password }),
    backendParams(
      "auth:login",
      { responseCallback: http.expectedStatuses(200, 429) },
      { "Content-Type": "application/json" }
    )
  );
  checkStatus(res, [200, 429], "auth login");
  sleep(think(120, 180));
}
