import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Static guard: no SÚKL secret may be reachable from the frontend.
 *
 * The design puts the certificate and its password exclusively on the backend
 * Railway service. That is an architectural claim, and an architectural claim
 * that nothing enforces is a claim that decays — one `process.env.SUKL_...` in a
 * server component, one `NEXT_PUBLIC_SUKL_*` added "just to show the status",
 * and the guarantee is gone with no test going red.
 *
 * So this walks the frontend source and asserts:
 *   1. No file READS a SUKL_ environment variable.
 *   2. No NEXT_PUBLIC_SUKL_* variable exists anywhere.
 *
 * It checks for reads, not mentions. The admin console legitimately prints
 * variable NAMES in its help text ("set SUKL_TEST_PFX_PASSWORD on the backend
 * service"), which is useful to an operator and leaks nothing — banning the
 * string outright would only teach people to work around the test.
 *
 * The frontend reaches SÚKL solely by proxying to the backend over a cookie-
 * authenticated HTTP call, which needs no SÚKL variable at all.
 */

const FRONTEND = join(__dirname, "..", "..", "..", "..", "frontend");
const SCAN_DIRS = ["app", "lib", "components"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "coverage"]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // Frontend not present (e.g. backend-only standalone checkout).
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Reads, not mentions:
 *   process.env.SUKL_X   process.env["SUKL_X"]   env.SUKL_X   NEXT_PUBLIC_SUKL_X
 */
const READ_PATTERNS = [
  /process\s*\.\s*env\s*\.\s*SUKL_/,
  /process\s*\.\s*env\s*\[\s*["'`]SUKL_/,
  /\benv\s*\.\s*SUKL_/,
  /NEXT_PUBLIC_SUKL/,
];

test("no frontend source file reads a SUKL_ environment variable", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(FRONTEND, d)));
  if (files.length === 0) return; // Nothing to scan; not a failure.

  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (READ_PATTERNS.some((re) => re.test(text))) {
      offenders.push(file.slice(FRONTEND.length + 1));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "SÚKL environment variables must never be READ from the frontend — the certificate " +
      "and password live only on the backend service. Offending files:\n" +
      offenders.join("\n"),
  );
});

test("no NEXT_PUBLIC_SUKL_* variable is defined anywhere in the backend config", () => {
  const envFiles = [
    join(__dirname, "..", "..", "config", "env.ts"),
    join(__dirname, "..", "..", "..", ".env.example"),
  ];
  for (const file of envFiles) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    assert.ok(
      !/NEXT_PUBLIC_SUKL/.test(text),
      `${file} declares a NEXT_PUBLIC_SUKL_* variable — that would publish it to the browser`,
    );
  }
});
