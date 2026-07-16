/**
 * Backfill null translatable fields on non-default-locale PageContentTranslation
 * rows. Today those nulls render via the safe-hybrid per-field fallback to the
 * country's default-locale row (see getPublicPageContent in
 * page-content.service.ts, `mixedLocaleFields`) — i.e. mixed-language pages.
 * This script replaces the fallback with a real translation, written into the
 * null field itself.
 *
 * Scope discipline: only fills nulls on EXISTING rows. Never creates rows,
 * never overwrites a non-null value.
 *
 * Mirrors backfill-footer-translations.ts / frontend/scripts/translate-missing.mjs:
 * OpenAI gpt-4o-mini, healthcare register, preserve placeholders/HTML, brands
 * untranslated, pt = PT-PT, no medical claims added.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/backfill-page-content-translations.ts            # dry-run (default)
 *   node --env-file=.env --import tsx scripts/backfill-page-content-translations.ts --apply    # writes
 */
import { prisma } from "../src/db/prisma.js";
import type { LocaleCode, PageContentTranslation } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
// Resolved against cwd — run this script from backend/ (matches every other
// script's usage line: `node --import tsx scripts/<name>.ts`).
const LOG_PATH = path.resolve(process.cwd(), "scripts/backfill-page-content-translations.dryrun.log");

const LANG_NAME: Record<string, string> = {
  PT: "European Portuguese (PT-PT)",
  ES: "Spanish (Spain)",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
  EN: "English",
};

const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-4o-mini";

// Plain-string translatable fields (null-check + translate whole value).
const STRING_FIELDS = [
  "heroTitle",
  "heroSubtitle",
  "heroTitleLead",
  "heroTitleAccent",
  "ctaLabel",
  "intro",
  "whoForTitle",
  "whoForIntro",
  "whyChooseTitle",
  "disclaimerShort",
  "body",
  "seoTitle",
  "seoDescription",
] as const;

// JSON string[] fields.
const STRING_ARRAY_FIELDS = ["whoForItems", "whyChooseItems", "disclaimerParagraphs"] as const;

// Fields whose content is legal/compliance-sensitive — flag rows touching
// them for human review rather than silently trusting MT.
const REVIEW_FIELDS = new Set(["disclaimerShort", "disclaimerParagraphs"]);

type FaqItem = { question: string; answer: string };

function loadApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set (check backend/.env)");
  return key;
}

async function translateBatch(
  apiKey: string,
  sourceLocale: string,
  targetLocale: string,
  entries: { key: string; en: string }[],
) {
  const system = `You are a professional medical/healthcare localizer for a licensed telemedicine platform (Global Health).
Translate UI strings from ${LANG_NAME[sourceLocale]} into ${LANG_NAME[targetLocale]}.
Rules:
- Formal, patient-facing clinical register. Concise UI phrasing.
- Preserve {placeholders} EXACTLY as-is. Preserve any HTML tags exactly.
- Never translate brand names (Global Health, Stripe, Doctify, WhatsApp, Randox), currencies, URLs, emails.
- This is one country/market's page content, translated into a different language for readers who use that language — it is NOT localized for a different country. Every country/place name (e.g. "România", "Portugal", "República Checa") must refer to the exact same country as the source text, just spelled/inflected in the target language. NEVER swap in a country that's merely associated with the target language (e.g. do not turn "in România" into "in España" just because the target language is Spanish).
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
  return JSON.parse(data.choices[0].message.content) as Record<string, string>;
}

async function translateWithRetry(
  apiKey: string,
  sourceLocale: string,
  targetLocale: string,
  entries: { key: string; en: string }[],
) {
  if (!entries.length) return {} as Record<string, string>;
  for (let attempt = 1; ; attempt++) {
    try {
      return await translateBatch(apiKey, sourceLocale, targetLocale, entries);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/** Flattens the source row's values for exactly the null fields into a flat
 * translate-key -> text list, so JSON array fields reuse the same simple
 * batch-translate contract as plain strings. */
function extractEntries(target: PageContentTranslation, source: PageContentTranslation) {
  const entries: { key: string; en: string }[] = [];
  const nullStringFields: string[] = [];
  const nullArrayFields: string[] = [];
  let nullFaq = false;

  for (const f of STRING_FIELDS) {
    if (target[f] != null) continue;
    const srcVal = source[f];
    if (typeof srcVal === "string" && srcVal.trim()) {
      entries.push({ key: f, en: srcVal });
      nullStringFields.push(f);
    }
  }

  for (const f of STRING_ARRAY_FIELDS) {
    if (target[f] != null) continue;
    const srcVal = source[f] as unknown;
    if (Array.isArray(srcVal) && srcVal.length) {
      let any = false;
      srcVal.forEach((v, i) => {
        if (typeof v === "string" && v.trim()) {
          entries.push({ key: `${f}[${i}]`, en: v });
          any = true;
        }
      });
      if (any) nullArrayFields.push(f);
    }
  }

  if (target.faq == null) {
    const srcFaq = source.faq as unknown as FaqItem[] | null;
    if (Array.isArray(srcFaq) && srcFaq.length) {
      let any = false;
      srcFaq.forEach((item, i) => {
        if (item?.question?.trim()) {
          entries.push({ key: `faq[${i}].question`, en: item.question });
          any = true;
        }
        if (item?.answer?.trim()) {
          entries.push({ key: `faq[${i}].answer`, en: item.answer });
          any = true;
        }
      });
      if (any) nullFaq = true;
    }
  }

  return { entries, nullStringFields, nullArrayFields, nullFaq };
}

/** Rebuilds the Prisma update payload for one row from the flat translation
 * map, using the source row to preserve array length/shape. */
function buildUpdateData(
  source: PageContentTranslation,
  out: Record<string, string>,
  nullStringFields: string[],
  nullArrayFields: string[],
  nullFaq: boolean,
) {
  const data: Record<string, unknown> = {};

  for (const f of nullStringFields) {
    if (out[f]) data[f] = out[f];
  }

  for (const f of nullArrayFields) {
    const srcVal = (source as unknown as Record<string, string[]>)[f];
    data[f] = srcVal.map((v, i) => out[`${f}[${i}]`] ?? v);
  }

  if (nullFaq) {
    const srcFaq = source.faq as unknown as FaqItem[];
    data.faq = srcFaq.map((item, i) => ({
      question: out[`faq[${i}].question`] ?? item.question,
      answer: out[`faq[${i}].answer`] ?? item.answer,
    }));
  }

  return data;
}

async function main() {
  const apiKey = loadApiKey();
  const log: string[] = [];
  const print = (line: string) => {
    log.push(line);
    console.log(line);
  };

  const rows = await prisma.pageContentTranslation.findMany({
    include: {
      pageContent: { include: { country: { select: { code: true, defaultLocale: true } } } },
    },
  });

  const perLocaleFieldCounts: Record<string, number> = {};
  const perLocaleRowCounts: Record<string, number> = {};
  let totalFieldsFilled = 0;
  let rowsProcessed = 0;
  let rowsSkippedNoSource = 0;
  let rowsSkippedNothingToFill = 0;
  const flaggedForReview: string[] = [];
  let sampleShown = 0;

  for (const row of rows) {
    const { pageContent } = row;
    const country = pageContent.country;
    if (row.locale === country.defaultLocale) continue; // default-locale row is the source, not a target

    const sourceRow = rows.find(
      (r) => r.pageContentId === row.pageContentId && r.locale === country.defaultLocale,
    );
    if (!sourceRow) {
      rowsSkippedNoSource++;
      continue;
    }

    const { entries, nullStringFields, nullArrayFields, nullFaq } = extractEntries(row, sourceRow);
    if (!entries.length) {
      rowsSkippedNothingToFill++;
      continue;
    }

    const out = await translateWithRetry(apiKey, sourceRow.locale, row.locale, entries);
    const data = buildUpdateData(sourceRow, out, nullStringFields, nullArrayFields, nullFaq);
    const filledFieldNames = [...nullStringFields, ...nullArrayFields, ...(nullFaq ? ["faq"] : [])];

    rowsProcessed++;
    perLocaleRowCounts[row.locale] = (perLocaleRowCounts[row.locale] ?? 0) + 1;
    perLocaleFieldCounts[row.locale] = (perLocaleFieldCounts[row.locale] ?? 0) + filledFieldNames.length;
    totalFieldsFilled += filledFieldNames.length;

    const rowLabel = `${country.code}/${pageContent.pageKey} [${row.locale}] (row ${row.id}, source ${sourceRow.locale})`;
    if (filledFieldNames.some((f) => REVIEW_FIELDS.has(f))) {
      flaggedForReview.push(`${rowLabel} — fields: ${filledFieldNames.filter((f) => REVIEW_FIELDS.has(f)).join(", ")}`);
    }

    if (sampleShown < 10) {
      print(`\n=== ${rowLabel} ===`);
      for (const e of entries) {
        print(`  ${e.key}:`);
        print(`    source (${sourceRow.locale}): ${e.en}`);
        print(`    translated (${row.locale}):  ${out[e.key]}`);
      }
      sampleShown++;
    } else {
      print(`${rowLabel} — ${filledFieldNames.length} field(s): ${filledFieldNames.join(", ")}`);
    }

    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.pageContentTranslation.findUnique({ where: { id: row.id } });
        if (!fresh) return;
        // Re-check nulls against the live row so a concurrent write can never
        // be clobbered — only write fields still null right now.
        const stillNullData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if ((fresh as Record<string, unknown>)[k] == null) stillNullData[k] = v;
        }
        if (Object.keys(stillNullData).length) {
          await tx.pageContentTranslation.update({ where: { id: row.id }, data: stillNullData });
        }
      });
    }
  }

  print(`\n${APPLY ? "APPLIED" : "DRY RUN"} summary`);
  print(`rows with >=1 null field, source available and non-empty: ${rowsProcessed}`);
  print(`rows skipped (no default-locale sibling row): ${rowsSkippedNoSource}`);
  print(`rows skipped (nulls present but source also empty): ${rowsSkippedNothingToFill}`);
  print(`total fields ${APPLY ? "filled" : "would be filled"}: ${totalFieldsFilled}`);
  print(`by locale (rows / fields):`);
  for (const locale of Object.keys(perLocaleRowCounts).sort()) {
    print(`  ${locale}: ${perLocaleRowCounts[locale]} rows / ${perLocaleFieldCounts[locale]} fields`);
  }
  if (flaggedForReview.length) {
    print(`\nFlagged for human review (legal/disclaimer fields touched):`);
    for (const f of flaggedForReview) print(`  - ${f}`);
  }
  if (!APPLY) print("\nDry run only — pass --apply to write.");

  await writeFile(LOG_PATH, log.join("\n") + "\n", "utf8");
  console.log(`\nFull dry-run log written to ${LOG_PATH}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
