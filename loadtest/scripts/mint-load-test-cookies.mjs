#!/usr/bin/env node
// Logs in once per seeded test account (backend/scripts/seed-test-accounts.ts
// must have been run against the target DB first) and writes the resulting
// gh_auth cookies to loadtest/config/cookies.json for k6 to read.
//
// Deliberately does this in plain Node against the real /api/auth/login
// endpoint — not backend/scripts/mint-dev-session.ts, which refuses any
// non-local DATABASE_URL — so it exercises the exact login path (and its
// 10/15min rate limit) real users go through, just once per account.
//
// Usage: node loadtest/scripts/mint-load-test-cookies.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targets = JSON.parse(
  readFileSync(path.join(__dirname, "../config/targets.json"), "utf8")
);
const passwords = JSON.parse(
  readFileSync(path.join(__dirname, "../config/seed-passwords.json"), "utf8")
);

const ACCOUNTS = [
  { role: "PATIENT", email: "patient@globalhealthonline.com", passwordKey: "PATIENT" },
  { role: "PATIENT", email: "patient2@globalhealthonline.com", passwordKey: "PATIENT2" },
  { role: "DOCTOR", email: "doctor@globalhealthonline.com", passwordKey: "DOCTOR" },
  { role: "DOCTOR", email: "doctor2@globalhealthonline.com", passwordKey: "DOCTOR2" },
  { role: "ADMIN", email: "admin@globalhealthonline.com", passwordKey: "ADMIN" },
  { role: "ADMIN", email: "superadmin@globalhealthonline.com", passwordKey: "SUPER_ADMIN" },
];

// The deployed cookie name is gh_admin_session, not the gh_auth default
// documented in backend/.env.example — this environment overrides
// AUTH_COOKIE_NAME. Confirmed by inspecting a live login response rather
// than assumed.
const AUTH_COOKIE_NAME = "gh_admin_session";

function parseAuthCookie(setCookieHeaders) {
  const list = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders].filter(Boolean);
  for (const raw of list) {
    const [pair] = raw.split(";");
    if (pair && pair.trim().startsWith(`${AUTH_COOKIE_NAME}=`)) return pair.trim();
  }
  return null;
}

async function login(email, password) {
  const res = await fetch(`${targets.backendBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  if (body.needs2fa) {
    throw new Error(
      `login for ${email} requires 2FA — disable 2FA on this test account or extend this script`
    );
  }
  const setCookie = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : res.headers.get("set-cookie");
  const cookie = parseAuthCookie(setCookie);
  if (!cookie) throw new Error(`no gh_auth cookie in response for ${email}`);
  return cookie;
}

async function main() {
  const out = [];
  for (const acct of ACCOUNTS) {
    const password = passwords[acct.passwordKey];
    if (!password) {
      console.warn(`Skipping ${acct.email}: no password for key ${acct.passwordKey}`);
      continue;
    }
    try {
      const cookie = await login(acct.email, password);
      out.push({ role: acct.role, email: acct.email, cookie });
      console.log(`OK  ${acct.role.padEnd(8)} ${acct.email}`);
    } catch (err) {
      console.error(`FAIL ${acct.email}: ${err.message}`);
    }
    // Small gap so this stays nowhere near the 10/15min login limit even
    // if re-run a few times during setup.
    await new Promise((r) => setTimeout(r, 500));
  }

  const outPath = path.join(__dirname, "../config/cookies.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} cookies to ${outPath}`);
  if (out.length === 0) {
    process.exitCode = 1;
  }
}

main();
