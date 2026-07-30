#!/usr/bin/env node
// scripts/check-override-drift.mjs — S-004 override drift gate.
//
// WHY THIS EXISTS
// ---------------
// This repo is a pnpm workspace, but `frontend` and `backend` are each built
// and deployed STANDALONE: the deploy runs `pnpm install --ignore-workspace`,
// so the root `package.json` `pnpm.overrides` block is NOT inherited by the
// deployed artifact. A security-motivated pin (transitive-CVE fix, forced
// minimum) that lives only in the root does nothing for the shipped service —
// it must be MIRRORED into the `pnpm.overrides` of every service that actually
// resolves the dependency. See docs/guides/dependency-overrides.md.
//
// This check FAILS (exit 1) when:
//   1. the same override KEY is pinned to DIFFERENT values across the files, or
//   2. a root-declared override KEY is ABSENT from a service whose standalone
//      lockfile actually resolves that package (the pin would silently not
//      apply at deploy time).
// A key legitimately missing from a service that does NOT resolve the package
// is fine and is not flagged. Exits 0 when the three blocks are consistent.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  { name: "root", pkg: "package.json", lock: "pnpm-lock.yaml" },
  { name: "frontend", pkg: "frontend/package.json", lock: "frontend/pnpm-lock.yaml" },
  { name: "backend", pkg: "backend/package.json", lock: "backend/pnpm-lock.yaml" },
];

function readJson(rel) {
  return JSON.parse(readFileSync(join(repoRoot, rel), "utf8"));
}

function readLock(rel) {
  try {
    return readFileSync(join(repoRoot, rel), "utf8");
  } catch {
    return null; // no standalone lockfile → cannot gate on resolution
  }
}

// An override key may carry a `@<selector>` (e.g. "brace-expansion@5", "ws@7")
// that is NOT part of the package name. Scoped packages start with "@" and keep
// their leading "@scope/name".
function bareName(key) {
  const at = key.lastIndexOf("@");
  return at > 0 ? key.slice(0, at) : key;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Collect every resolved version of `pkg` in this service's standalone
// lockfile. pnpm-lock lists resolved packages as `name@version:` entries;
// match slash/quote/space-prefixed forms so older layouts still hit.
function lockResolvedVersions(lockText, pkg) {
  if (!lockText) return [];
  const re = new RegExp(`(?:^|[\\s/'"])${escapeRe(pkg)}@(\\d+\\.\\d+\\.\\d+[^\\s:'"()]*)`, "gm");
  const out = [];
  for (const m of lockText.matchAll(re)) out.push(m[1]);
  return out;
}

// Numeric major.minor.patch compare (ignores prerelease/build suffix). Returns
// negative if a < b, 0 if equal, positive if a > b.
function cmpVersion(a, b) {
  const pa = a.split(/[.+-]/).map(Number);
  const pb = b.split(/[.+-]/).map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// Strip range/selector chars from an override target value → the pinned floor
// version. "^2.17.4" → "2.17.4", "8.5.10" → "8.5.10".
function pinnedFloor(value) {
  const m = String(value).match(/\d+\.\d+\.\d+[^\s]*/);
  return m ? m[0] : null;
}

const services = FILES.map((f) => ({
  ...f,
  overrides: readJson(f.pkg).pnpm?.overrides ?? {},
  lockText: readLock(f.lock),
}));

const root = services.find((s) => s.name === "root");
const children = services.filter((s) => s.name !== "root");
const problems = [];

// 1) Value divergence across any files that declare the same key.
for (const key of new Set(services.flatMap((s) => Object.keys(s.overrides)))) {
  const declared = services
    .filter((s) => key in s.overrides)
    .map((s) => ({ name: s.name, value: s.overrides[key] }));
  if (new Set(declared.map((d) => d.value)).size > 1) {
    problems.push(
      `value mismatch for "${key}": ` +
        declared.map((d) => `${d.name}=${d.value}`).join(", "),
    );
  }
}

// 2) Root-declared key missing from a child that resolves the package BELOW the
//    pinned floor. A child that already resolves an equal-or-newer version is
//    safe (the pin is a minimum, not an exact requirement) and is not flagged —
//    otherwise the gate would red-light on benign newer patch releases.
for (const [key, value] of Object.entries(root.overrides)) {
  const pkg = bareName(key);
  const floor = pinnedFloor(value);
  for (const child of children) {
    if (key in child.overrides) continue; // present → handled by check (1)
    const resolved = lockResolvedVersions(child.lockText, pkg);
    if (resolved.length === 0) continue; // child doesn't resolve it → pin irrelevant
    const below = floor ? resolved.filter((v) => cmpVersion(v, floor) < 0) : [];
    if (below.length > 0) {
      problems.push(
        `"${key}" (root pin ${value}) is MISSING from ${child.name}, whose lockfile ` +
          `resolves "${pkg}" BELOW the pinned floor (${[...new Set(below)].join(", ")}) → ` +
          `the security pin does not apply to the standalone deploy`,
      );
    }
  }
}

if (problems.length) {
  console.error("Override drift detected across package.json pnpm.overrides blocks:\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\nMirror each pin into every service that resolves the package. " +
      "See docs/guides/dependency-overrides.md.",
  );
  process.exit(1);
}

console.log("pnpm.overrides are consistent across root, frontend, and backend.");
