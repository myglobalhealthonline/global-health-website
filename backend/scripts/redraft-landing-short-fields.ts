/**
 * Re-translate landing-page short fields the first pass left half-English.
 *
 * The original prompt produced titles like "Hypertension Care Ireland |
 * Médico en línea" — the model translated the segment after the pipe and left
 * the leading keyword phrase in English. The draft validators check tags,
 * URLs, numbers and placeholders, none of which catch an untranslated run, so
 * these passed review and shipped.
 *
 * Detects the pattern by longest-common-substring against the source (URLs and
 * hrefs stripped first, since those are preserved on purpose), re-translates
 * with an explicit instruction to translate the WHOLE value, and rejects a
 * retry that is still too close to the source. bodyHtml is excluded: its
 * shared runs are the hrefs we deliberately keep.
 *
 * Updates the draft JSONL in place, and with --apply also overwrites exactly
 * those fields in the database (the normal apply script refuses to overwrite,
 * which is right for it and wrong here).
 *
 *   node --import tsx --env-file=.env scripts/redraft-landing-short-fields.ts
 *   node --import tsx --env-file=.env scripts/redraft-landing-short-fields.ts --apply
 */
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type LocaleCode } from "@prisma/client";
import { Pool } from "pg";

const LOCALE_NAMES: Record<string, string> = {
  EN: "English",
  PT: "Portuguese",
  ES: "Spanish",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
};

type Row = {
  key: string;
  landingPageId: string;
  countryCode: string;
  slug: string;
  field: string;
  sourceLocale: string;
  targetLocale: string;
  sourceText: string;
  draftText: string;
  validationIssues: string[];
  [k: string]: unknown;
};

const APPLY = process.argv.includes("--apply");
const MIN_RUN = Number(
  process.argv.find((a) => a.startsWith("--min-run="))?.split("=")[1] ?? "15",
);
const inputFile = path.join(process.cwd(), "tmp", "i18n-drafts", "seo-landing-pages.jsonl");
const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini";

const stripUrls = (t: string) => t.replace(/href="[^"]*"|https?:\/\/\S+/g, "");

/**
 * Names that must survive translation verbatim: statutory regulators, the
 * legal instruments themselves, and the brand. The first retry pass happily
 * turned "Ordem dos Médicos" into "portugalské lékařské komoře" and
 * "eNeschopenka" into "eKrankschreibung" — both are the actual names of real
 * institutions and documents, not descriptive phrases, and a patient cannot
 * verify a regulator we renamed for them.
 */
const PROTECTED_TERMS = [
  "Global Health",
  "Ordem dos Médicos",
  "eNeschopenka",
  "Neschopenka",
  "ePrescription",
  "Irish Medical Council",
  "IMC",
  "ČLK",
  "CRM",
  "CMR",
  "CORU",
  "ERS",
  "NRPZS",
];

/**
 * Protected terms present in the source that the retry dropped.
 *
 * Matched on word boundaries: a bare substring test flagged "ERS" inside
 * ordinary words ("others", "Beschwerden") and rejected good translations.
 */
function droppedProtected(source: string, retry: string): string[] {
  const present = (haystack: string, term: string) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu")
      .test(haystack);
  return PROTECTED_TERMS.filter((term) => present(source, term) && !present(retry, term));
}

/** Longest run of characters the draft still shares with its source. */
function longestShared(a: string, b: string): string {
  let best = "";
  for (let i = 0; i < a.length; i++) {
    for (let j = a.length; j > i + best.length; j--) {
      const slice = a.slice(i, j);
      if (b.includes(slice) && slice.length > best.length) {
        best = slice;
        break;
      }
    }
  }
  return best.trim();
}

async function callOpenAi(body: object): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2_000 * 2 ** (attempt - 1)));
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OpenAI transient (${response.status})`);
        continue;
      }
      if (!response.ok) throw new Error(`OpenAI failed (${response.status}): ${await response.text()}`);
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("OpenAI failed")) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function outputText(response: unknown): string | null {
  const body = (response ?? {}) as { output_text?: unknown; output?: unknown };
  if (typeof body.output_text === "string") return body.output_text.trim() || null;
  if (!Array.isArray(body.output)) return null;
  return (
    body.output
      .flatMap((item) =>
        item && typeof item === "object" && Array.isArray((item as { content?: unknown }).content)
          ? (item as { content: Array<{ text?: unknown }> }).content
          : [],
      )
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("")
      .trim() || null
  );
}

async function retranslate(row: Row): Promise<string> {
  const target = LOCALE_NAMES[row.targetLocale] ?? row.targetLocale;
  const prompt = [
    `Translate this ${row.field} of a patient-facing medical page into ${target}.`,
    `Translate the ENTIRE value, including any leading topic or keyword phrase. A previous attempt returned "${row.draftText}", which wrongly left the opening phrase in English — do not repeat that.`,
    `Render condition names, care words and country names in ${target}. Preserve the separator characters, capitalisation style and any numbers.`,
    `Do NOT translate the names of real institutions, statutory regulators or legal instruments — e.g. "Global Health", "Ordem dos Médicos", "eNeschopenka", "Irish Medical Council". These are proper nouns a patient needs in order to verify them, not descriptive phrases. Leave them exactly as they appear in the source.`,
    "Keep clinical meaning strictly equivalent; where the source hedges, hedge. Return only the translated value — no commentary, labels or quotes.",
    "SOURCE:",
    row.sourceText,
  ].join("\n\n");

  const body = await callOpenAi({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: 2_000,
    input: prompt,
  });
  const out = outputText(body);
  if (!out) throw new Error("no text returned");
  return out.replace(/^["']|["']$/g, "").trim();
}

async function main() {
  if (!existsSync(inputFile)) throw new Error(`No draft file at ${inputFile}`);
  const rows: Row[] = readFileSync(inputFile, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Row);

  // --restore: pull draftText back from the database. The DB holds what was
  // actually applied, so this undoes an unwanted local retry pass without
  // needing a backup of the JSONL.
  if (process.argv.includes("--restore")) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    let restored = 0;
    for (const row of rows) {
      if (!row.redraftedAt) continue;
      const live = await prisma.seoLandingPageTranslation.findUnique({
        where: {
          landingPageId_locale: {
            landingPageId: row.landingPageId,
            locale: row.targetLocale as LocaleCode,
          },
        },
        select: { title: true, seoTitle: true, seoDescription: true, bodyHtml: true },
      });
      const value = live?.[row.field as keyof typeof live];
      if (typeof value === "string" && value.trim()) {
        row.draftText = value;
        delete (row as Record<string, unknown>).redraftedAt;
        restored += 1;
      }
    }
    writeFileSync(inputFile, rows.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
    console.log(`restored ${restored} draft rows from the database`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const suspect = rows.filter(
    (r) =>
      r.field !== "bodyHtml" &&
      longestShared(stripUrls(r.sourceText), stripUrls(r.draftText)).length >= MIN_RUN,
  );
  console.log(`${rows.length} drafts | ${suspect.length} short fields look part-untranslated\n`);

  let fixed = 0;
  let kept = 0;
  for (const row of suspect) {
    try {
      const retry = await retranslate(row);
      const dropped = droppedProtected(row.sourceText, retry);
      if (dropped.length) {
        console.log(`GUARD ${row.key}  — retry dropped ${dropped.join(", ")}, keeping original`);
        console.log(`        rejected: ${retry}`);
        kept += 1;
        continue;
      }
      const run = longestShared(stripUrls(row.sourceText), stripUrls(retry)).length;
      if (run >= MIN_RUN) {
        // Still overlapping — very likely a genuine cognate ("Diabetes"),
        // not a failure. Leave the original rather than churn it.
        console.log(`KEEP  ${row.key}  (retry still shares ${run} chars — likely a real cognate)`);
        console.log(`        ${retry}`);
        kept += 1;
        continue;
      }
      console.log(`FIX   ${row.key}`);
      console.log(`        was: ${row.draftText}`);
      console.log(`        now: ${retry}`);
      row.draftText = retry;
      (row as Record<string, unknown>).redraftedAt = new Date().toISOString();
      fixed += 1;
    } catch (error) {
      console.log(`FAIL  ${row.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (fixed > 0) {
    writeFileSync(inputFile, rows.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
    console.log(`\ndraft file updated (${fixed} rows)`);
  }

  if (APPLY && fixed > 0) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    let written = 0;
    for (const row of rows) {
      if (!row.redraftedAt) continue;
      await prisma.seoLandingPageTranslation.update({
        where: {
          landingPageId_locale: {
            landingPageId: row.landingPageId,
            locale: row.targetLocale as LocaleCode,
          },
        },
        data: { [row.field]: row.draftText },
      });
      written += 1;
    }
    console.log(`applied ${written} corrected fields to the database`);
    await prisma.$disconnect();
    await pool.end();
  } else if (fixed > 0) {
    console.log("DRY RUN — re-run with --apply to write these to the database");
  }

  console.log(`\nfixed ${fixed}, kept ${kept}`);
}

void main();
