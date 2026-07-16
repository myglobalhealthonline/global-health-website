/**
 * Translate locale keys en -> {pt,es,cs,ro,de} via OpenAI.
 *
 * Usage:
 *   node scripts/translate-missing.mjs <manifest.json> [--dry-run] [--locales=pt,es]
 *
 * Manifest shape: { "items": [{ "namespace": "common", "key": "actions.learnMore" }] }
 * Reads the English value from locales/en/<namespace>.json, translates, writes
 * the value into each target locale file at the same key path.
 *
 * OPENAI_API_KEY read from ../backend/.env (or process env). Model override:
 * OPENAI_TRANSLATE_MODEL (default gpt-4o-mini).
 *
 * Prompt enforces: healthcare telemedicine register, preserve {placeholders}
 * and HTML tags, brands untranslated, PT-PT dialect, no medical claims added.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TARGETS = ["pt", "es", "cs", "ro", "de"];
const LANG_NAME = { pt: "European Portuguese (PT-PT)", es: "Spanish (Spain)", cs: "Czech", ro: "Romanian", de: "German" };

const args = process.argv.slice(2);
const manifestPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const localesArg = args.find((a) => a.startsWith("--locales="));
const locales = localesArg ? localesArg.split("=")[1].split(",") : TARGETS;
if (!manifestPath) {
  console.error("Usage: node scripts/translate-missing.mjs <manifest.json> [--dry-run] [--locales=pt,es]");
  process.exit(1);
}

async function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = await readFile(path.resolve(ROOT, "../backend/.env"), "utf8");
  const m = env.match(/^OPENAI_API_KEY=(.+)$/m);
  if (!m) throw new Error("OPENAI_API_KEY not found in backend/.env or env");
  return m[1].trim().replace(/^"|"$/g, "");
}

function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let o = obj;
  for (const k of parts.slice(0, -1)) {
    if (typeof o[k] !== "object" || o[k] === null) o[k] = {};
    o = o[k];
  }
  o[parts[parts.length - 1]] = value;
}

const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-4o-mini";

async function translateBatch(apiKey, locale, entries) {
  // entries: [{key, en}]
  const system = `You are a professional medical/healthcare localizer for a licensed telemedicine platform (Global Health).
Translate UI strings from English into ${LANG_NAME[locale]}.
Rules:
- Formal, patient-facing clinical register. Concise UI phrasing.
- Preserve {placeholders} EXACTLY as-is. Preserve any HTML tags exactly.
- Never translate brand names (Global Health, Stripe, Doctify, WhatsApp, Randox), currencies, URLs, emails.
- Do not add or strengthen medical claims. Never introduce words meaning guarantee, cure, miracle, risk-free, 100% safe, instant results. Google/Meta healthcare ads policy compliant.
- pt = European Portuguese (PT-PT), not Brazilian.
Return ONLY a JSON object mapping each input key to its translation. No commentary.`;
  const user = JSON.stringify(Object.fromEntries(entries.map((e) => [e.key, e.en])));
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

const placeholderRe = /\{([A-Za-z0-9_]+)\}/g;
function placeholdersOf(s) {
  return [...String(s).matchAll(placeholderRe)].map((m) => m[1]).sort().join("|");
}

async function main() {
  const apiKey = await loadApiKey();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  // perLocale shape: {"perLocale":{"pt":[{namespace,key}],...}} — run each
  // locale group independently and exit.
  if (manifest.perLocale) {
    for (const [locale, localeItems] of Object.entries(manifest.perLocale)) {
      if (!TARGETS.includes(locale) || !localeItems.length) continue;
      await runItems(apiKey, localeItems, [locale]);
    }
    finish();
    return;
  }

  const items = manifest.items ?? manifest;
  if (!Array.isArray(items) || !items.length) throw new Error("Manifest has no items");
  await runItems(apiKey, items, locales);
  finish();
}

let written = 0;
const failures = [];

function finish() {
  console.log(`\n${written} translations ${dryRun ? "(dry-run)" : "written"}.`);
  if (failures.length) {
    console.error(`${failures.length} failure(s):`);
    for (const f of failures) console.error(" - " + f);
    process.exitCode = 1;
  }
}

async function runItems(apiKey, items, locales) {
  // group by namespace
  const byNs = new Map();
  for (const it of items) {
    if (!byNs.has(it.namespace)) byNs.set(it.namespace, []);
    byNs.get(it.namespace).push(it.key);
  }

  for (const [ns, keys] of byNs) {
    const enJson = JSON.parse(await readFile(path.join(ROOT, "locales/en", ns + ".json"), "utf8"));
    const entries = [];
    for (const key of [...new Set(keys)]) {
      const en = getPath(enJson, key);
      if (typeof en !== "string") {
        failures.push(`${ns}:${key} — no English string at this path`);
        continue;
      }
      entries.push({ key, en });
    }
    for (const locale of locales) {
      const filePath = path.join(ROOT, "locales", locale, ns + ".json");
      const json = JSON.parse(await readFile(filePath, "utf8"));
      // translate in chunks of 40
      for (let i = 0; i < entries.length; i += 40) {
        const chunk = entries.slice(i, i + 40);
        let out;
        for (let attempt = 1; ; attempt++) {
          try {
            out = await translateBatch(apiKey, locale, chunk);
            break;
          } catch (e) {
            if (attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
        for (const { key, en } of chunk) {
          const tr = out[key];
          if (typeof tr !== "string" || !tr.trim()) {
            failures.push(`${locale}/${ns}:${key} — no translation returned`);
            continue;
          }
          if (placeholdersOf(en) !== placeholdersOf(tr)) {
            failures.push(`${locale}/${ns}:${key} — placeholder mismatch, skipped ("${tr}")`);
            continue;
          }
          if (dryRun) console.log(`[dry] ${locale}/${ns}:${key} = ${tr}`);
          else setPath(json, key, tr);
          written++;
        }
      }
      if (!dryRun) await writeFile(filePath, JSON.stringify(json, null, 2) + "\n");
      console.log(`${locale}/${ns}: ${entries.length} keys done`);
    }
  }
}

await main();
