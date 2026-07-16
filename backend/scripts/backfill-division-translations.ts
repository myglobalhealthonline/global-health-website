/**
 * Backfill DoctorCountryTranslation rows (the `division` label, e.g. Irish
 * Medical Council "General Division" / "Specialist Division") for every
 * DoctorCountry that has a non-null `division`, for every locale except the
 * country's default.
 *
 * Mirrors backfill-trust-translations.ts: known values are translated via a
 * FIXED dictionary (no API call, no garble risk); anything not in the
 * dictionary falls back to OpenAI gpt-4o-mini with the same healthcare
 * register/garble-guard contract.
 *
 * Idempotent: skips (doctorCountryId, locale) pairs that already have a row.
 *
 * Usage:
 *   node --import tsx scripts/backfill-division-translations.ts            # dry-run (default)
 *   node --import tsx scripts/backfill-division-translations.ts --apply    # writes rows
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

// Known register-division labels, hardcoded per DISTINCT value found in the
// DB (checked read-only 2026-07-17: "General Division" x21, "Specialist
// Division" x11, both Irish Medical Council). Anything not listed here falls
// back to OpenAI.
const FIXED_TRANSLATIONS: Record<string, Partial<Record<LocaleCode, string>>> = {
  "General Division": {
    EN: "General Division",
    PT: "Divisão Geral",
    ES: "División General",
    CS: "Obecná divize",
    RO: "Divizia Generală",
    DE: "Allgemeine Abteilung",
  },
  "Specialist Division": {
    EN: "Specialist Division",
    PT: "Divisão de Especialista",
    ES: "División de Especialista",
    CS: "Specializovaná divize",
    RO: "Divizia de Specialitate",
    DE: "Facharztabteilung",
  },
};

const skippedPairs: string[] = [];

function loadApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set (check backend/.env)");
  return key;
}

function systemPrompt(locale: string): string {
  return `You are a professional medical/healthcare localizer for a licensed telemedicine platform (Global Health).
Translate a short medical-register division label into ${LANG_NAME[locale]}. The source string may be in any language; the output MUST be entirely in ${LANG_NAME[locale]}.
Rules:
- This is a short UI label (2-6 words) shown next to a doctor's registration number. Keep it concise, formal register.
- Never translate proper names of regulators, registries, colleges or official bodies — keep them exactly as given; translate only the descriptive words around them.
- pt = European Portuguese (PT-PT), not Brazilian.
Return ONLY a JSON object mapping each input key to its translation. No commentary.`;
}

async function callOpenAI(apiKey: string, locale: string, payload: Record<string, string>) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(locale) },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as Record<string, string>;
}

async function callWithRetry(apiKey: string, locale: string, payload: Record<string, string>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await callOpenAI(apiKey, locale, payload);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function translateDivision(
  apiKey: string,
  locale: LocaleCode,
  source: string,
  label: string,
): Promise<string | undefined> {
  const fixed = FIXED_TRANSLATIONS[source]?.[locale];
  if (fixed) return fixed;

  for (let retry = 0; retry < 2; retry++) {
    try {
      const out = await callWithRetry(apiKey, locale, { division: source });
      if (out["division"]) return out["division"];
    } catch (e) {
      console.log(`  .. OpenAI error for ${label} ${locale}, retry ${retry + 1}: ${(e as Error).message}`);
    }
  }
  skippedPairs.push(`${label} ${locale}`);
  console.log(`  !! SKIPPED (no translation after retries): ${label} ${locale}`);
  return undefined;
}

async function main() {
  const apiKey = loadApiKey();

  const rows = await prisma.doctorCountry.findMany({
    where: { division: { not: null } },
    include: {
      country: { select: { code: true, defaultLocale: true } },
      divisionTranslations: true,
      doctor: { select: { fullName: true } },
    },
  });

  let plannedRows = 0;
  let skippedExisting = 0;

  for (const row of rows) {
    const source = row.division!;
    const label = `[DoctorCountry ${row.country.code}] ${row.doctor.fullName}`;
    const targetLocales = ALL_LOCALES.filter((l) => l !== row.country.defaultLocale);
    const existingLocales = new Set(row.divisionTranslations.map((t) => t.locale));

    for (const locale of targetLocales) {
      if (existingLocales.has(locale)) {
        skippedExisting++;
        console.log(`${label} -> ${locale}: already exists — skip`);
        continue;
      }

      const translated = await translateDivision(apiKey, locale, source, label);
      if (translated === undefined) continue;

      console.log(`${label} -> ${locale}: "${source}" -> "${translated}"`);
      plannedRows++;

      if (APPLY) {
        await prisma.$transaction(async (tx) => {
          const alreadyExists = await tx.doctorCountryTranslation.findUnique({
            where: { doctorCountryId_locale: { doctorCountryId: row.id, locale } },
          });
          if (alreadyExists) return; // idempotent: race with a concurrent run
          await tx.doctorCountryTranslation.create({
            data: { doctorCountryId: row.id, locale, division: translated },
          });
        });
        console.log(`  [applied]`);
      }
    }
  }

  console.log(
    `\n${APPLY ? "Applied" : "Dry-run"}: DoctorCountryTranslation ${plannedRows} row(s) ${APPLY ? "written" : "would be written"}, ${skippedExisting} skipped (already exist).`,
  );
  if (skippedPairs.length) {
    console.log(`\nPairs SKIPPED (not written):`);
    for (const p of skippedPairs) console.log(`  - ${p}`);
  } else {
    console.log(`\nNo skipped pairs.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
