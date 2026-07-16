/**
 * Backfill missing-locale DoctorTranslation (title/bio/SEO) and DoctorFaq
 * (question/answer) rows so doctor profile pages stop rendering
 * untranslated content on non-authored locales.
 *
 * Root cause: doctors are authored once, in their country's defaultLocale.
 * DoctorTranslation and DoctorFaq are flat per-locale row tables (no
 * separate "translation" child table needed — the `locale` column IS the
 * translation key), but rows for the other supported locales were simply
 * never created. The public API's fallback (resolveDoctorFaqs /
 * mergeDoctorTranslation: requested -> country defaultLocale -> base) then
 * serves the one authored locale to every visitor.
 *
 * Only fills gaps:
 *   - DoctorTranslation: creates a row for any locale enabled on the
 *     doctor's country (CountryLocale, defaults included) that has no row
 *     yet. Source = the country-defaultLocale row if present, else
 *     whichever locale exists.
 *   - DoctorFaq: for a doctor with FAQs in exactly one locale set, creates
 *     a full parallel set (same question/answer pairing, new sortOrder) for
 *     every other enabled locale that currently has zero rows. Never
 *     touches a locale that already has >=1 row (partial locale sets are
 *     left alone — those look admin-authored, not a leak).
 *
 * Doctors/doctorCountries with NO source content in any locale (blank
 * drafts) are skipped and reported — there is nothing to translate from.
 *
 * Mirrors backfill-page-content-translations.ts: OpenAI gpt-4o-mini,
 * healthcare register, preserve HTML, pt = PT-PT, official English body
 * names (e.g. "Irish Medical Council") kept in English inside translated
 * sentences, no new medical claims.
 *
 * Usage (run from backend/):
 *   node --env-file=.env --import tsx scripts/backfill-doctor-content-translations.ts            # dry-run (default)
 *   node --env-file=.env --import tsx scripts/backfill-doctor-content-translations.ts --apply    # writes
 */
import { prisma } from "../src/db/prisma.js";
import type { LocaleCode } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const LOG_PATH = path.resolve(process.cwd(), "scripts/backfill-doctor-content-translations.dryrun.log");

const LANG_NAME: Record<LocaleCode, string> = {
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

async function translateBatch(
  apiKey: string,
  sourceLocale: LocaleCode,
  targetLocale: LocaleCode,
  entries: { key: string; text: string }[],
): Promise<Record<string, string>> {
  const system = `You are a professional medical/healthcare localizer for a licensed telemedicine platform (Global Health).
Translate patient-facing doctor-profile text from ${LANG_NAME[sourceLocale]} into ${LANG_NAME[targetLocale]}.
Rules:
- Formal, clinical-register, patient-facing tone. Preserve any HTML tags exactly as-is.
- Preserve proper names, registration numbers, and medical-council/chamber names exactly (e.g. "Irish Medical Council", "Ordem dos Médicos", "ČLK") — keep them in their official form, just frame the surrounding sentence in the target language. Do not translate the council name itself.
- Never translate brand names (Global Health, Stripe, Doctify, WhatsApp), currencies, URLs, emails.
- Do not add or strengthen medical claims. Never introduce words meaning guarantee, cure, miracle, risk-free, 100% safe, instant results.
- pt = European Portuguese (PT-PT), not Brazilian.
Return ONLY a JSON object mapping each input key to its translation. No commentary.`;
  const user = JSON.stringify(Object.fromEntries(entries.map((e) => [e.key, e.text])));
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
  sourceLocale: LocaleCode,
  targetLocale: LocaleCode,
  entries: { key: string; text: string }[],
): Promise<Record<string, string>> {
  if (!entries.length) return {};
  for (let attempt = 1; ; attempt++) {
    try {
      return await translateBatch(apiKey, sourceLocale, targetLocale, entries);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  const apiKey = loadApiKey();
  const log: string[] = [];
  const print = (line: string) => {
    log.push(line);
    console.log(line);
  };

  // Countries -> enabled locale set (CountryLocale rows + implicit defaultLocale).
  const countries = await prisma.country.findMany({
    select: { id: true, code: true, defaultLocale: true, countryLocales: { select: { locale: true } } },
  });
  const enabledLocales = new Map<string, Set<LocaleCode>>();
  const defaultLocaleOf = new Map<string, LocaleCode>();
  for (const c of countries) {
    const set = new Set<LocaleCode>(c.countryLocales.map((l) => l.locale));
    set.add(c.defaultLocale);
    enabledLocales.set(c.id, set);
    defaultLocaleOf.set(c.id, c.defaultLocale);
  }

  const counts = {
    translationRowsCreated: 0,
    translationDoctorsSkippedNoSource: 0,
    faqRowsCreated: 0,
    faqDoctorsSkippedNoSource: 0,
  };
  const perLocale: Record<string, { translationRows: number; faqRows: number }> = {};
  const bump = (locale: LocaleCode, field: "translationRows" | "faqRows", n = 1) => {
    perLocale[locale] ??= { translationRows: 0, faqRows: 0 };
    perLocale[locale][field] += n;
  };
  const flaggedNoSource: string[] = [];
  let samplesShown = 0;

  // ---------- 1. DoctorTranslation (title/bio/SEO) ----------
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      fullName: true,
      countryId: true,
      title: true,
      bio: true,
      seoTitle: true,
      seoDescription: true,
      translations: { select: { locale: true, title: true, bio: true, seoTitle: true, seoDescription: true } },
    },
  });

  for (const doctor of doctors) {
    const enabled = enabledLocales.get(doctor.countryId);
    if (!enabled) continue;
    const defaultLocale = defaultLocaleOf.get(doctor.countryId)!;
    const haveLocales = new Set(doctor.translations.map((t) => t.locale));
    const missing = [...enabled].filter((l) => !haveLocales.has(l));
    if (!missing.length) continue;

    const source =
      doctor.translations.find((t) => t.locale === defaultLocale) ?? doctor.translations[0];
    if (!source) {
      counts.translationDoctorsSkippedNoSource++;
      flaggedNoSource.push(`DoctorTranslation: ${doctor.fullName} (${doctor.id}) — zero translation rows, nothing to translate from`);
      continue;
    }

    const fields: { key: "title" | "bio" | "seoTitle" | "seoDescription"; text: string }[] = [];
    if (source.title?.trim()) fields.push({ key: "title", text: source.title });
    if (source.bio?.trim()) fields.push({ key: "bio", text: source.bio });
    if (source.seoTitle?.trim()) fields.push({ key: "seoTitle", text: source.seoTitle });
    if (source.seoDescription?.trim()) fields.push({ key: "seoDescription", text: source.seoDescription });
    if (!fields.length) continue;

    for (const targetLocale of missing) {
      const out = await translateWithRetry(apiKey, source.locale, targetLocale, fields);
      const data = {
        title: out.title ?? source.title ?? doctor.title,
        bio: out.bio ?? source.bio ?? null,
        seoTitle: out.seoTitle ?? source.seoTitle ?? null,
        seoDescription: out.seoDescription ?? source.seoDescription ?? null,
      };

      counts.translationRowsCreated++;
      bump(targetLocale, "translationRows");

      const label = `DoctorTranslation ${doctor.fullName} (${doctor.id}) [${source.locale} -> ${targetLocale}]`;
      if (samplesShown < 8) {
        print(`\n=== ${label} ===`);
        for (const f of fields) {
          print(`  ${f.key}:`);
          print(`    source (${source.locale}): ${f.text}`);
          print(`    translated (${targetLocale}): ${out[f.key]}`);
        }
        samplesShown++;
      } else {
        print(`${label} — fields: ${fields.map((f) => f.key).join(", ")}`);
      }

      if (APPLY) {
        await prisma.$transaction(async (tx) => {
          const stillMissing = await tx.doctorTranslation.findUnique({
            where: { doctorId_locale: { doctorId: doctor.id, locale: targetLocale } },
          });
          if (stillMissing) return; // created concurrently — never overwrite
          await tx.doctorTranslation.create({
            data: { doctorId: doctor.id, locale: targetLocale, ...data },
          });
        });
      }
    }
  }

  // ---------- 2. DoctorFaq (question/answer) ----------
  const faqRows = await prisma.doctorFaq.findMany({
    select: {
      id: true,
      doctorId: true,
      locale: true,
      question: true,
      answer: true,
      category: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  const faqDoctorIds = [...new Set(faqRows.map((f) => f.doctorId))];
  const faqDoctors = await prisma.doctor.findMany({
    where: { id: { in: faqDoctorIds } },
    select: { id: true, fullName: true, countryId: true },
  });

  for (const doctor of faqDoctors) {
    const enabled = enabledLocales.get(doctor.countryId);
    if (!enabled) continue;
    const defaultLocale = defaultLocaleOf.get(doctor.countryId)!;
    const rowsForDoctor = faqRows.filter((f) => f.doctorId === doctor.id);
    const haveLocales = new Set(rowsForDoctor.map((f) => f.locale));
    const missing = [...enabled].filter((l) => !haveLocales.has(l));
    if (!missing.length) continue;

    const sourceLocale = haveLocales.has(defaultLocale) ? defaultLocale : rowsForDoctor[0]?.locale;
    if (!sourceLocale) {
      counts.faqDoctorsSkippedNoSource++;
      flaggedNoSource.push(`DoctorFaq: ${doctor.fullName} (${doctor.id}) — no FAQ rows, nothing to translate from`);
      continue;
    }
    const sourceRows = rowsForDoctor
      .filter((f) => f.locale === sourceLocale)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (!sourceRows.length) continue;

    const entries = sourceRows.flatMap((r, i) => [
      { key: `q${i}`, text: r.question },
      { key: `a${i}`, text: r.answer },
    ]);

    for (const targetLocale of missing) {
      const out = await translateWithRetry(apiKey, sourceLocale, targetLocale, entries);
      const label = `DoctorFaq ${doctor.fullName} (${doctor.id}) [${sourceLocale} -> ${targetLocale}], ${sourceRows.length} item(s)`;
      if (samplesShown < 8) {
        print(`\n=== ${label} ===`);
        sourceRows.slice(0, 2).forEach((r, i) => {
          print(`  Q: source(${sourceLocale}) ${r.question}`);
          print(`     translated(${targetLocale}) ${out[`q${i}`]}`);
          print(`  A: source(${sourceLocale}) ${r.answer}`);
          print(`     translated(${targetLocale}) ${out[`a${i}`]}`);
        });
        samplesShown++;
      } else {
        print(label);
      }

      counts.faqRowsCreated += sourceRows.length;
      bump(targetLocale, "faqRows", sourceRows.length);

      if (APPLY) {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.doctorFaq.findFirst({
            where: { doctorId: doctor.id, locale: targetLocale },
            select: { id: true },
          });
          if (existing) return; // a row appeared concurrently — never overwrite/duplicate
          await tx.doctorFaq.createMany({
            data: sourceRows.map((r, i) => ({
              doctorId: doctor.id,
              locale: targetLocale,
              question: out[`q${i}`] ?? r.question,
              answer: out[`a${i}`] ?? r.answer,
              category: r.category,
              sortOrder: i,
              isActive: r.isActive,
            })),
          });
        });
      }
    }
  }

  print(`\n${APPLY ? "APPLIED" : "DRY RUN"} summary`);
  print(`DoctorTranslation rows ${APPLY ? "created" : "would be created"}: ${counts.translationRowsCreated}`);
  print(`DoctorTranslation doctors skipped (no source content in any locale): ${counts.translationDoctorsSkippedNoSource}`);
  print(`DoctorFaq rows ${APPLY ? "created" : "would be created"}: ${counts.faqRowsCreated}`);
  print(`DoctorFaq doctors skipped (no source content in any locale): ${counts.faqDoctorsSkippedNoSource}`);
  print(`by locale:`);
  for (const locale of Object.keys(perLocale).sort()) {
    print(`  ${locale}: ${perLocale[locale].translationRows} DoctorTranslation row(s), ${perLocale[locale].faqRows} DoctorFaq row(s)`);
  }
  if (flaggedNoSource.length) {
    print(`\nFlagged for human review (no source content — likely blank draft profiles):`);
    for (const f of flaggedNoSource) print(`  - ${f}`);
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
