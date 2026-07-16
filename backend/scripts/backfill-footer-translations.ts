/**
 * Backfill CountryFooterTranslation rows for every CountryFooter that has
 * translatable text (tagline / contactHours / copyrightLine / customColumns
 * title+label values), for every locale except the country's default.
 *
 * Mirrors frontend/scripts/translate-missing.mjs: OpenAI gpt-4o-mini,
 * healthcare register, preserve placeholders/HTML, brands untranslated,
 * pt = PT-PT, no medical claims added.
 *
 * Idempotent: skips (footer, locale) pairs that already have a translation
 * row. customColumns is translated field-by-field (title + each link.label)
 * with structure/hrefs preserved untouched.
 *
 * Usage:
 *   node --import tsx scripts/backfill-footer-translations.ts            # dry-run (default)
 *   node --import tsx scripts/backfill-footer-translations.ts --apply    # writes rows
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import type { LocaleCode } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const ALL_LOCALES: LocaleCode[] = ["EN", "PT", "ES", "CS", "RO", "DE"];
const LANG_NAME: Record<string, string> = {
  PT: "European Portuguese (PT-PT)",
  ES: "Spanish (Spain)",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
  EN: "English",
};

const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-4o-mini";

function loadApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set (check backend/.env)");
  return key;
}

async function translateBatch(apiKey: string, locale: string, entries: { key: string; en: string }[]) {
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
  return JSON.parse(data.choices[0].message.content) as Record<string, string>;
}

async function translateWithRetry(apiKey: string, locale: string, entries: { key: string; en: string }[]) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await translateBatch(apiKey, locale, entries);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

type CustomColumn = { title: string; links: { label: string; href: string; external?: boolean }[] };

async function main() {
  const apiKey = loadApiKey();

  const footers = await prisma.countryFooter.findMany({
    include: { country: { select: { code: true, defaultLocale: true } }, translations: true },
  });

  let plannedRows = 0;
  let skippedExisting = 0;

  for (const footer of footers) {
    const targetLocales = ALL_LOCALES.filter((l) => l !== footer.country.defaultLocale);
    const existingLocales = new Set(footer.translations.map((t) => t.locale));

    // Base translatable text (base row = default-locale copy).
    const baseEntries: { key: string; en: string }[] = [];
    if (footer.tagline) baseEntries.push({ key: "tagline", en: footer.tagline });
    if (footer.contactHours) baseEntries.push({ key: "contactHours", en: footer.contactHours });
    if (footer.copyrightLine) baseEntries.push({ key: "copyrightLine", en: footer.copyrightLine });

    const customColumns = (footer.customColumns as CustomColumn[] | null) ?? [];
    customColumns.forEach((col, ci) => {
      if (col.title) baseEntries.push({ key: `customColumns.${ci}.title`, en: col.title });
      (col.links ?? []).forEach((link, li) => {
        if (link.label) baseEntries.push({ key: `customColumns.${ci}.${li}.label`, en: link.label });
      });
    });

    if (!baseEntries.length) {
      console.log(`[${footer.country.code}] no translatable text on this footer — skip`);
      continue;
    }

    for (const locale of targetLocales) {
      if (existingLocales.has(locale)) {
        skippedExisting++;
        console.log(`[${footer.country.code}] ${locale}: translation row already exists — skip (idempotent)`);
        continue;
      }

      const out = await translateWithRetry(apiKey, locale, baseEntries);

      const result: { tagline?: string; contactHours?: string; copyrightLine?: string; customColumns?: CustomColumn[] } = {};
      if (footer.tagline) result.tagline = out["tagline"];
      if (footer.contactHours) result.contactHours = out["contactHours"];
      if (footer.copyrightLine) result.copyrightLine = out["copyrightLine"];
      if (customColumns.length) {
        result.customColumns = customColumns.map((col, ci) => ({
          title: out[`customColumns.${ci}.title`] ?? col.title,
          links: (col.links ?? []).map((link, li) => ({
            ...link,
            label: out[`customColumns.${ci}.${li}.label`] ?? link.label,
          })),
        }));
      }

      console.log(`\n[${footer.country.code}] -> ${locale}:`);
      for (const e of baseEntries) {
        console.log(`  ${e.key}:`);
        console.log(`    before: ${e.en}`);
        console.log(`    after:  ${out[e.key]}`);
      }
      plannedRows++;

      if (APPLY) {
        await prisma.countryFooterTranslation.create({
          data: {
            countryFooterId: footer.id,
            locale,
            tagline: result.tagline,
            contactHours: result.contactHours,
            copyrightLine: result.copyrightLine,
            customColumns: result.customColumns as any,
          },
        });
        console.log(`  [applied]`);
      }
    }
  }

  console.log(
    `\n${APPLY ? "Applied" : "Dry-run"}: ${plannedRows} translation row(s) ${APPLY ? "written" : "would be written"}, ${skippedExisting} skipped (already exist).`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
