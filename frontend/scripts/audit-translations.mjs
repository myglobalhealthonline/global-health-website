/**
 * Translation & language audit — `pnpm run audit:translations` (also `npm run audit:translations`).
 *
 * Superset of check-locale-keys.mjs. Audits:
 *   1. Locale JSON health vs the en baseline (missing/extra/empty/type-mismatch/
 *      placeholder-mismatch/identical-to-en/duplicate raw keys/invalid locale dirs).
 *   2. Code heuristics: hardcoded user-facing strings, pages in localized route
 *      groups that never touch the i18n lib, backend content fetches that don't
 *      pass a locale.
 *   3. Wiring assertions: cookie persistence, per-key English fallback,
 *      resolution chain, switcher refresh, html lang.
 *
 * Writes docs/translation-audit/translation-audit.{md,json} at the repo root.
 * Exits non-zero when CRITICAL findings exist (safe as a CI gate).
 *
 * No new i18n framework, no dependencies — node built-ins only.
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, "..");
const localesRoot = path.join(frontendRoot, "locales");
const reportDir = path.join(repoRoot, "docs", "translation-audit");

const SUPPORTED_LOCALES = ["en", "pt", "es", "cs", "ro", "de"];
const BASE_LOCALE = "en";
const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;

// ---------------------------------------------------------------------------
// Intentionally-untranslated allowlist (requirement 6): brands, technical
// terms, and strings identical across languages must NOT be flagged.
// ---------------------------------------------------------------------------
const BRAND_TERMS = [
  "Global Health",
  "Doctify",
  "Stripe",
  "WhatsApp",
  "Randox",
  "Make.com",
  "Google",
  "Apple Pay",
  "Google Pay",
  "PayPal",
  "IBAN",
  "GDPR",
  "HSE",
  "NRPZS",
  "IMC",
  "CORU",
  "SNS",
  "PIN",
  "SMS",
  "FAQ",
  "OK",
  "Wi-Fi",
  "Email",
  "E-mail",
  "Online",
  "Blog",
  "Cookie",
  "Cookies",
];
const brandSet = new Set(BRAND_TERMS.map((t) => t.toLowerCase()));

// Keys the existing checker already exempts (kept for parity).
const ignoredNamespaceKeys = {
  "account.json": new Set(["portal.adminPortal", "portal.userPortal", "portal.rootBreadcrumb"]),
  "subscription.json": new Set([
    "pricing.trust_card1_title",
    "pricing.trust_card1_subtitle",
    "pricing.trust_card2_title",
    "pricing.trust_card2_subtitle",
    "pricing.trust_card3_title",
    "pricing.trust_card3_subtitle",
  ]),
};

/** True when an identical en/locale value is legitimately untranslated. */
function isIntentionallyUntranslated(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (v.length <= 2) return true; // "OK", "×", single glyphs
  if (!/[a-zA-ZÀ-ſ]/.test(v)) return true; // numbers/punctuation only
  if (/^https?:\/\//i.test(v) || v.startsWith("/") || v.startsWith("mailto:")) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true; // email
  if (/^\{[A-Za-z0-9_]+\}$/.test(v)) return true; // placeholder-only
  if (/^[A-Z0-9 .&+-]{2,}$/.test(v)) return true; // acronyms / codes
  if (brandSet.has(v.toLowerCase())) return true;
  // single word containing a brand term ("Stripe protected" is NOT skipped)
  if (!v.includes(" ") && BRAND_TERMS.some((t) => t.toLowerCase() === v.toLowerCase())) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
/** @type {Array<{severity:"critical"|"warning"|"info", type:string, file:string, key?:string, locale?:string, english?:string, value?:string, recommendation:string}>} */
const findings = [];

const RECOMMENDATIONS = {
  "missing-key": "Add the key to the locale file with a reviewed translation (do not machine-copy English silently). Until then the per-key deep-merge falls back to English.",
  "extra-key": "Remove the orphan key or add it to en (English is the schema source of truth).",
  "empty-value": "Provide a translation; empty strings render as blank UI text.",
  "type-mismatch": "Match the English structure exactly (string vs object vs array); mismatched shapes break the deep-merge fallback.",
  "placeholder-mismatch": "Make the {placeholders} identical to English; missing placeholders render raw or drop data.",
  "identical-to-english": "Review: translate if this is real copy, or add the term to the allowlist in scripts/audit-translations.mjs if intentionally untranslated (brand/technical term).",
  "duplicate-key": "Remove the duplicate — JSON.parse silently keeps only the last occurrence, so one of the two values is dead.",
  "invalid-locale": "Locale directories must be exactly: " + SUPPORTED_LOCALES.join(", ") + ". Rename or delete.",
  "missing-namespace-file": "Create the file (copy en structure, translate values).",
  "extra-namespace-file": "Delete it or add the same namespace to en.",
  "hardcoded-text": "Move the string into the appropriate locales/en/*.json namespace and reference it via the locale bundle, then translate in all 6 locales.",
  "page-without-i18n": "Wire the page to getPageLocale()/loadLocaleBundle() (or receive locale via layout props) so it renders in the selected language.",
  "fetch-without-locale": "Thread the resolved locale to the backend call (?locale= param) or content will fall back to the country default language.",
  "wiring": "See detail.",
};

function add(severity, type, file, extra = {}) {
  findings.push({ severity, type, file, recommendation: RECOMMENDATIONS[type] ?? "", ...extra });
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------
function flattenJson(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item, index) =>
        Object.assign(acc, flattenJson(item, prefix ? `${prefix}.${index}` : String(index))),
      {},
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return Object.assign(acc, flattenJson(child, nextPrefix));
    }, {});
  }
  return { [prefix]: value };
}

function jsonType(v) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

/** Structure map: dotted path of every OBJECT/ARRAY node -> type, for shape comparison. */
function structureMap(value, prefix = "", out = {}) {
  const t = jsonType(value);
  if (prefix) out[prefix] = t;
  if (t === "object") {
    for (const [k, child] of Object.entries(value)) structureMap(child, prefix ? `${prefix}.${k}` : k, out);
  } else if (t === "array") {
    value.forEach((child, i) => structureMap(child, prefix ? `${prefix}.${i}` : String(i), out));
  }
  return out;
}

function sortedPlaceholders(value) {
  if (typeof value !== "string") return [];
  return Array.from(value.matchAll(placeholderPattern), (m) => m[1]).sort();
}

/**
 * Duplicate-key detector on RAW JSON text (JSON.parse hides duplicates).
 * Minimal tokenizer: tracks object key sets per nesting frame.
 */
function findDuplicateRawKeys(raw) {
  const dups = [];
  const stack = []; // {keys:Set, path:string[]} for objects; null for arrays
  let i = 0;
  let pendingKey = null;
  const pathParts = [];
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      // read string
      let j = i + 1;
      let s = "";
      while (j < raw.length && raw[j] !== '"') {
        if (raw[j] === "\\") {
          s += raw[j] + (raw[j + 1] ?? "");
          j += 2;
        } else {
          s += raw[j];
          j += 1;
        }
      }
      // is it a key? next non-space char is ':'
      let k = j + 1;
      while (k < raw.length && /\s/.test(raw[k])) k++;
      const top = stack[stack.length - 1];
      if (raw[k] === ":" && top && top !== "array") {
        const keyPath = [...pathParts, s].join(".");
        if (top.keys.has(s)) dups.push(keyPath);
        top.keys.add(s);
        pendingKey = s;
      }
      i = j + 1;
      continue;
    }
    if (ch === "{") {
      stack.push({ keys: new Set() });
      if (pendingKey !== null) pathParts.push(pendingKey);
      else pathParts.push("");
      pendingKey = null;
    } else if (ch === "[") {
      stack.push("array");
      if (pendingKey !== null) pathParts.push(pendingKey);
      else pathParts.push("");
      pendingKey = null;
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      pathParts.pop();
    } else if (ch === ",") {
      pendingKey = null;
    }
    i += 1;
  }
  return dups.map((p) => p.split(".").filter(Boolean).join("."));
}

async function readJsonRaw(filePath) {
  const raw = await readFile(filePath, "utf8");
  return { raw, json: JSON.parse(raw) };
}

// ---------------------------------------------------------------------------
// Part 1 — locale JSON audit
// ---------------------------------------------------------------------------
async function auditLocaleFiles() {
  const entries = await readdir(localesRoot, { withFileTypes: true });
  const localeDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  for (const dir of localeDirs) {
    if (!SUPPORTED_LOCALES.includes(dir)) {
      add("critical", "invalid-locale", `frontend/locales/${dir}`, { locale: dir });
    }
  }
  for (const locale of SUPPORTED_LOCALES) {
    if (!localeDirs.includes(locale)) {
      add("critical", "invalid-locale", `frontend/locales/${locale}`, {
        locale,
        value: "directory missing entirely",
      });
    }
  }

  const baseDir = path.join(localesRoot, BASE_LOCALE);
  const baseNamespaces = (await readdir(baseDir)).filter((n) => n.endsWith(".json")).sort();

  // Preload en (raw + parsed) once.
  const baseData = {};
  for (const ns of baseNamespaces) {
    baseData[ns] = await readJsonRaw(path.join(baseDir, ns));
    // duplicate keys in en itself
    for (const dup of findDuplicateRawKeys(baseData[ns].raw)) {
      add("critical", "duplicate-key", `frontend/locales/en/${ns}`, { key: dup, locale: "en" });
    }
  }

  const stats = {};
  for (const locale of SUPPORTED_LOCALES.filter((l) => l !== BASE_LOCALE && localeDirs.includes(l))) {
    const localeDir = path.join(localesRoot, locale);
    const localeNamespaces = (await readdir(localeDir)).filter((n) => n.endsWith(".json")).sort();
    stats[locale] = { missing: 0, empty: 0, identical: 0, total: 0 };

    for (const ns of baseNamespaces.filter((n) => !localeNamespaces.includes(n))) {
      add("critical", "missing-namespace-file", `frontend/locales/${locale}/${ns}`, { locale });
    }
    for (const ns of localeNamespaces.filter((n) => !baseNamespaces.includes(n))) {
      add("critical", "extra-namespace-file", `frontend/locales/${locale}/${ns}`, { locale });
    }

    for (const ns of baseNamespaces.filter((n) => localeNamespaces.includes(n))) {
      const file = `frontend/locales/${locale}/${ns}`;
      let parsed;
      try {
        parsed = await readJsonRaw(path.join(localeDir, ns));
      } catch (err) {
        add("critical", "type-mismatch", file, { locale, value: `unparseable JSON: ${err.message}` });
        continue;
      }
      const { raw, json } = parsed;

      for (const dup of findDuplicateRawKeys(raw)) {
        add("critical", "duplicate-key", file, { key: dup, locale });
      }

      const baseFlat = flattenJson(baseData[ns].json);
      const locFlat = flattenJson(json);
      const ignored = ignoredNamespaceKeys[ns] ?? new Set();
      const baseKeys = Object.keys(baseFlat).filter((k) => !ignored.has(k));
      const locKeys = Object.keys(locFlat).filter((k) => !ignored.has(k));
      const locKeySet = new Set(locKeys);
      const baseKeySet = new Set(baseKeys);
      stats[locale].total += baseKeys.length;

      // structure mismatches (string where en has object, etc.)
      const baseStruct = structureMap(baseData[ns].json);
      const locStruct = structureMap(json);
      for (const [p, t] of Object.entries(locStruct)) {
        const baseT = baseStruct[p];
        if (baseT && baseT !== t && !(baseT === "string" && t === "string")) {
          if ((baseT === "object" || baseT === "array" || t === "object" || t === "array") && !ignored.has(p)) {
            add("critical", "type-mismatch", file, {
              key: p,
              locale,
              english: baseT,
              value: t,
            });
          }
        }
      }

      // exempted keys (parity with check-locale-keys.mjs) still get surfaced,
      // just as warnings instead of CI-failing criticals
      for (const key of ignored) {
        if (key in baseFlat && !(key in locFlat)) {
          add("warning", "missing-key", file, {
            key,
            locale,
            english: String(baseFlat[key]),
            value: "exempted in check-locale-keys.mjs ignore list — renders English via fallback",
          });
        }
      }

      for (const key of baseKeys) {
        const enVal = baseFlat[key];
        if (!locKeySet.has(key)) {
          stats[locale].missing += 1;
          add("critical", "missing-key", file, { key, locale, english: String(enVal) });
          continue;
        }
        const locVal = locFlat[key];
        if (typeof locVal === "string" && locVal.trim() === "" && String(enVal).trim() !== "") {
          stats[locale].empty += 1;
          add("critical", "empty-value", file, { key, locale, english: String(enVal) });
          continue;
        }
        // placeholder parity
        const bp = sortedPlaceholders(enVal);
        const lp = sortedPlaceholders(locVal);
        if (bp.join("|") !== lp.join("|")) {
          add("critical", "placeholder-mismatch", file, {
            key,
            locale,
            english: `{${bp.join(",")}}`,
            value: `{${lp.join(",")}}`,
          });
        }
        // identical to English (warning; allowlist-aware)
        if (
          typeof locVal === "string" &&
          typeof enVal === "string" &&
          locVal === enVal &&
          !isIntentionallyUntranslated(enVal)
        ) {
          stats[locale].identical += 1;
          add("warning", "identical-to-english", file, { key, locale, english: enVal });
        }
      }
      for (const key of locKeys) {
        if (!baseKeySet.has(key)) {
          add("warning", "extra-key", file, { key, locale, value: String(locFlat[key]) });
        }
      }
    }
  }
  return { baseNamespaces, stats };
}

// ---------------------------------------------------------------------------
// Part 2 — code heuristics
// ---------------------------------------------------------------------------
async function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x)) && !/\.(test|spec)\./.test(e.name)) out.push(full);
  }
  return out;
}

const JSX_TEXT_RE = />\s*([A-Za-zÀ-ſ][^<>{}\n]*\s+[^<>{}\n]*[a-zà-ſ][^<>{}\n]*)\s*</g;
const ATTR_TEXT_RE = /(?:placeholder|aria-label|alt|title)=\s*"([A-Za-z][^"]{4,})"/g;

function looksLikeCopy(text) {
  const t = text.trim();
  if (t.length < 6) return false;
  if (!/\s/.test(t)) return false; // multi-word only
  if (!/[a-z]/.test(t)) return false; // skip SHOUTING acronym rows
  if (/^[\d\s.,:%€$+-]+$/.test(t)) return false;
  if (/^https?:|^\/|@.*\./.test(t)) return false;
  if (brandSet.has(t.toLowerCase())) return false;
  // skip code-ish content
  if (/[=;`]|=>|\bclassName\b|\bpx\b|\brem\b/.test(t)) return false;
  return true;
}

function stripCodeNoise(src) {
  // remove block/line comments to reduce false positives
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

async function auditHardcodedText() {
  const scanRoots = [
    path.join(frontendRoot, "app", "(site)"),
    path.join(frontendRoot, "app", "(auth)"),
    path.join(frontendRoot, "app", "(doctor)"),
    path.join(frontendRoot, "app", "(corporate)"),
    path.join(frontendRoot, "components"),
  ];
  const perFile = new Map();
  for (const root of scanRoots) {
    for (const file of await walk(root, [".tsx"])) {
      const src = stripCodeNoise(await readFile(file, "utf8"));
      const rel = path.relative(repoRoot, file).replaceAll("\\", "/");
      const hits = [];
      for (const m of src.matchAll(JSX_TEXT_RE)) {
        if (looksLikeCopy(m[1])) hits.push(m[1].trim());
      }
      for (const m of src.matchAll(ATTR_TEXT_RE)) {
        if (looksLikeCopy(m[1])) hits.push(`[attr] ${m[1].trim()}`);
      }
      if (hits.length) perFile.set(rel, [...new Set(hits)]);
    }
  }
  for (const [file, hits] of perFile) {
    add("warning", "hardcoded-text", file, {
      value: `${hits.length} candidate string(s): ${hits.slice(0, 5).map((h) => JSON.stringify(h)).join(", ")}${hits.length > 5 ? ", …" : ""}`,
    });
  }
  return perFile;
}

async function auditPagesWithoutI18n() {
  // localized route groups: page.tsx should touch the i18n lib directly or via
  // a locale prop/param; flag pages with zero locale references.
  const roots = [
    path.join(frontendRoot, "app", "(site)"),
    path.join(frontendRoot, "app", "(auth)"),
    path.join(frontendRoot, "app", "(doctor)"),
  ];
  const offenders = [];
  for (const root of roots) {
    for (const file of (await walk(root, [".tsx"])).filter((f) => path.basename(f) === "page.tsx")) {
      const src = await readFile(file, "utf8");
      const usesI18n =
        /loadLocaleBundle|getPageLocale|getCommonLocale|readClientLocale|\block[a]?le\b|\blang\b|LocaleCode/i.test(src);
      if (!usesI18n && /<[A-Z][A-Za-z]*|return\s*\(/.test(src)) {
        const rel = path.relative(repoRoot, file).replaceAll("\\", "/");
        offenders.push(rel);
        add("warning", "page-without-i18n", rel);
      }
    }
  }
  return offenders;
}

const LOCALIZED_ENDPOINTS = /\/(doctors|services|pages|page-content|plans|blogs?|faqs?|health-tests|disclaimers|specialties|seo-landing)/;

async function auditFetchWithoutLocale() {
  const roots = [path.join(frontendRoot, "lib", "api"), path.join(frontendRoot, "app", "api")];
  const offenders = [];
  for (const root of roots) {
    for (const file of await walk(root, [".ts", ".tsx"])) {
      const src = await readFile(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, idx) => {
        if (!/fetch\s*\(/.test(line)) return;
        const urlish = lines.slice(idx, idx + 3).join(" ");
        if (!LOCALIZED_ENDPOINTS.test(urlish)) return;
        if (/\/admin\//.test(urlish)) return; // admin CRUD endpoints are not locale-driven
        const window = lines.slice(Math.max(0, idx - 6), idx + 8).join(" ");
        if (!/locale/i.test(window)) {
          const rel = path.relative(repoRoot, file).replaceAll("\\", "/");
          offenders.push(`${rel}:${idx + 1}`);
          add("warning", "fetch-without-locale", `${rel}:${idx + 1}`, {
            value: line.trim().slice(0, 120),
          });
        }
      });
    }
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// Part 3 — wiring assertions (locale persistence & fallback behavior)
// ---------------------------------------------------------------------------
async function auditWiring() {
  const checks = [];
  async function fileHas(rel, re, label, detailPass, detailFail, severityOnFail = "warning") {
    let ok = false;
    try {
      ok = re.test(await readFile(path.join(frontendRoot, rel), "utf8"));
    } catch {
      ok = false;
    }
    checks.push({ label, file: `frontend/${rel}`, pass: ok, detail: ok ? detailPass : detailFail });
    if (!ok) add(severityOnFail, "wiring", `frontend/${rel}`, { value: `${label}: ${detailFail}` });
    return ok;
  }

  await fileHas(
    "lib/i18n/load-locale.ts",
    /deepMergeLocale\(/,
    "Per-key English fallback",
    "loadLocaleBundle deep-merges each locale over en — missing keys render English, not blank.",
    "No per-key fallback: a key missing from a non-en JSON renders empty/undefined.",
    "critical",
  );
  await fileHas(
    "lib/i18n/get-client-locale.ts",
    /max-age=\d+.*path=\/|path=\/.*max-age=\d+/s,
    "Cookie persistence (refresh/navigation)",
    "gh_locale written with path=/ and max-age — survives refresh and navigation.",
    "gh_locale cookie missing path=/ or max-age — selection may not persist.",
  );
  await fileHas(
    "lib/i18n/resolve-locale.ts",
    /\?\?\s*"en"/,
    "Hard fallback to en",
    "resolveLocale chain terminates in 'en'.",
    "resolveLocale has no terminal en fallback.",
    "critical",
  );
  await fileHas(
    "lib/i18n/get-page-locale.ts",
    /x-gh-locale[\s\S]*gh_locale|gh_locale[\s\S]*x-gh-locale/,
    "Server rendering reads header + cookie",
    "getPageLocale reads x-gh-locale header and gh_locale cookie.",
    "getPageLocale does not read both the middleware header and the cookie.",
  );
  await fileHas(
    "proxy.ts",
    /x-gh-locale/,
    "Middleware stamps locale header",
    "proxy.ts stamps x-gh-locale for server components.",
    "Middleware does not stamp x-gh-locale — server components can't see URL locale.",
    "critical",
  );
  await fileHas(
    "components/layout/LanguageSwitcher.tsx",
    /setClientLocaleCookie[\s\S]*?(router\.refresh|location\.href|location\.reload)|(router\.refresh|location\.href|location\.reload)[\s\S]*?setClientLocaleCookie/,
    "Language switcher re-renders after switch",
    "Switcher writes gh_locale cookie then reloads/refreshes so server-rendered content updates.",
    "Switcher writes the cookie without a refresh — stale language persists until manual reload.",
  );
  await fileHas(
    "app/layout.tsx",
    /getRootHtmlLang|lang=/,
    "html lang reflects locale",
    "Root layout sets <html lang> from resolved locale.",
    "Root layout hardcodes <html lang> — a11y/SEO language mismatch.",
  );

  // Admin portal: known unlocalized (informational — mirrors LOCALE_INVESTIGATION issue #5)
  let adminLocalized = false;
  try {
    const adminShell = await readFile(
      path.join(frontendRoot, "app", "(admin)", "admin", "_components", "admin-shell.tsx"),
      "utf8",
    );
    adminLocalized = /loadLocaleBundle|getCommonLocale|LocaleCode/.test(adminShell);
  } catch {
    /* ignore */
  }
  checks.push({
    label: "Admin portal localization",
    file: "frontend/app/(admin)/admin/_components/admin-shell.tsx",
    pass: adminLocalized,
    detail: adminLocalized
      ? "Admin shell references the i18n system."
      : "Admin portal is English-only by construction (no locale plumbing). Known/possibly intentional.",
  });
  if (!adminLocalized) {
    add("info", "wiring", "frontend/app/(admin)/admin/_components/admin-shell.tsx", {
      value: "Admin portal has no i18n plumbing — English-only by construction.",
    });
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function truncate(s, n = 80) {
  if (s === undefined) return "";
  const str = String(s).replaceAll("\n", " ");
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

function buildMarkdown({ stats, wiringChecks, counts }) {
  const lines = [];
  lines.push("# Translation Audit Report");
  lines.push("");
  lines.push(`Generated by \`pnpm run audit:translations\` (frontend/scripts/audit-translations.mjs).`);
  lines.push(`Baseline locale: **en**. Audited locales: ${SUPPORTED_LOCALES.join(", ")}.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Critical | ${counts.critical} |`);
  lines.push(`| Warning | ${counts.warning} |`);
  lines.push(`| Info | ${counts.info} |`);
  lines.push("");
  lines.push("### Per-locale key health (vs en)");
  lines.push("");
  lines.push("| Locale | Keys checked | Missing | Empty | Identical to en (flagged) |");
  lines.push("|---|---|---|---|---|");
  for (const [loc, s] of Object.entries(stats)) {
    lines.push(`| ${loc} | ${s.total} | ${s.missing} | ${s.empty} | ${s.identical} |`);
  }
  lines.push("");
  lines.push("## Wiring checks (persistence, fallback, SSR/CSR)");
  lines.push("");
  lines.push("| Check | File | Status | Detail |");
  lines.push("|---|---|---|---|");
  for (const c of wiringChecks) {
    lines.push(`| ${c.label} | \`${c.file}\` | ${c.pass ? "✅ pass" : "❌ FAIL"} | ${c.detail} |`);
  }
  lines.push("");

  const byType = new Map();
  for (const f of findings) {
    if (!byType.has(f.type)) byType.set(f.type, []);
    byType.get(f.type).push(f);
  }
  const order = [
    "invalid-locale", "missing-namespace-file", "extra-namespace-file", "duplicate-key",
    "type-mismatch", "missing-key", "empty-value", "placeholder-mismatch", "extra-key",
    "identical-to-english", "hardcoded-text", "page-without-i18n", "fetch-without-locale", "wiring",
  ];
  lines.push("## Findings");
  lines.push("");
  for (const type of order) {
    const group = byType.get(type);
    if (!group?.length) continue;
    const sev = group[0].severity;
    lines.push(`### ${type} (${group.length}) — ${sev}`);
    lines.push("");
    lines.push(`> ${RECOMMENDATIONS[type] ?? ""}`);
    lines.push("");
    lines.push("| File | Key | Locale | English value | Detail |");
    lines.push("|---|---|---|---|---|");
    const cap = type === "identical-to-english" || type === "hardcoded-text" ? 200 : 500;
    for (const f of group.slice(0, cap)) {
      lines.push(
        `| \`${f.file}\` | ${f.key ? `\`${truncate(f.key, 60)}\`` : ""} | ${f.locale ?? ""} | ${truncate(f.english, 60)} | ${truncate(f.value, 90)} |`,
      );
    }
    if (group.length > cap) lines.push(`| _…and ${group.length - cap} more (see JSON report)_ | | | | |`);
    lines.push("");
  }
  lines.push("## How to run");
  lines.push("");
  lines.push("```bash");
  lines.push("cd frontend && pnpm run audit:translations   # or npm run audit:translations");
  lines.push("```");
  lines.push("");
  lines.push("Exits non-zero when critical findings exist — safe to wire into CI next to `check:locales`.");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
async function main() {
  const { stats } = await auditLocaleFiles();
  await auditHardcodedText();
  await auditPagesWithoutI18n();
  await auditFetchWithoutLocale();
  const wiringChecks = await auditWiring();

  const counts = { critical: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;

  await mkdir(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "translation-audit.json");
  const mdPath = path.join(reportDir, "translation-audit.md");
  await writeFile(
    jsonPath,
    JSON.stringify({ baseline: BASE_LOCALE, locales: SUPPORTED_LOCALES, counts, stats, wiringChecks, findings }, null, 2),
  );
  await writeFile(mdPath, buildMarkdown({ stats, wiringChecks, counts }));

  console.log(`Translation audit: ${counts.critical} critical, ${counts.warning} warning, ${counts.info} info.`);
  console.log(`Report: ${path.relative(repoRoot, mdPath)} and ${path.relative(repoRoot, jsonPath)}`);
  if (counts.critical > 0) {
    console.error("CRITICAL translation problems found — failing (see report).");
    process.exitCode = 1;
  }
}

await main();
