/**
 * Backfill CountryAuthorityLinkTranslation and CountryLegalProfileTrustTranslation
 * rows for every base row that has translatable text, for every locale except
 * the country's default.
 *
 * Mirrors backfill-footer-translations.ts: OpenAI gpt-4o-mini, healthcare
 * register, preserve placeholders/HTML, brands untranslated, pt = PT-PT, no
 * medical claims added.
 *
 * Proper names are DETERMINISTIC: CountryAuthorityLink.name/.abbreviation and
 * CountryLegalProfile.regulatorName are official regulator/registry names and
 * are copied verbatim into every locale row — never sent to OpenAI. Only
 * description, providerRegistrationLabel, emergencyNotice and
 * dataProtectionLawName are machine-translated. dataProtectionLawName uses the
 * target language's established name for the law (GDPR -> RGPD in pt/es/ro,
 * DSGVO in de, GDPR stays in cs).
 *
 * Garble guard: a translated value that still contains >=3 consecutive words
 * of the source text (proper names/acronyms excluded) is retried individually;
 * after 2 failed retries the (field, locale) pair is SKIPPED and reported.
 *
 * Idempotent: skips (parent, locale) pairs that already have a translation row.
 *
 * Usage:
 *   node --import tsx scripts/backfill-trust-translations.ts            # dry-run (default)
 *   node --import tsx scripts/backfill-trust-translations.ts --apply    # writes rows
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
const GLOBAL_ALLOWLIST = ["NRPZS", "GDPR", "RGPD", "DSGVO"];

const skippedPairs: string[] = [];

function loadApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set (check backend/.env)");
  return key;
}

function systemPrompt(locale: string): string {
  return `You are a professional medical/healthcare localizer for a licensed telemedicine platform (Global Health).
Translate UI strings into ${LANG_NAME[locale]}. The source string may be in any language; the output MUST be entirely in ${LANG_NAME[locale]}.
Rules:
- Formal, patient-facing clinical register. Concise UI phrasing.
- Preserve {placeholders} EXACTLY as-is. Preserve any HTML tags exactly.
- Never translate brand names (Global Health, Stripe, Doctify, WhatsApp, Randox), currencies, URLs, emails.
- Never translate proper names of regulators, registries or official bodies (e.g. "Irish Medical Council", "Ordem dos Médicos", "NRPZS") — keep them exactly as given; translate only the descriptive text around them. Acronyms stay as-is.
- Exception — data-protection law names use the target language's established legal name: RGPD in Portuguese/Spanish/Romanian, DSGVO in German, GDPR in English/Czech.
- Do not add or strengthen medical claims. Never introduce words meaning guarantee, cure, miracle, risk-free, 100% safe, instant results. Google/Meta healthcare ads policy compliant.
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

const words = (s: string) => s.toLowerCase().match(/\p{L}[\p{L}\p{N}]*/gu) ?? [];

/**
 * True if `output` still contains >=3 consecutive words of `source`
 * (source trigrams containing an allowlisted proper-name/acronym token are
 * ignored). Signals an untranslated / garbled result. Trigram, not bigram:
 * bigrams false-positive on Romance-cognate pairs ("caso de", "consultas online").
 */
function isGarbled(source: string, output: string, allowlist: string[]): boolean {
  const allow = new Set(allowlist.flatMap(words));
  const src = words(source);
  const out = words(output).join(" ");
  for (let i = 0; i < src.length - 2; i++) {
    if (allow.has(src[i]) || allow.has(src[i + 1]) || allow.has(src[i + 2])) continue;
    if (out.includes(`${src[i]} ${src[i + 1]} ${src[i + 2]}`)) return true;
  }
  return false;
}

/**
 * Translate `entries` for one locale with the garble guard: batch call first,
 * then per-field individual retries (max 2) for garbled values. Fields still
 * garbled after retries are dropped from the result and logged in skippedPairs.
 */
async function translateGuarded(
  apiKey: string,
  locale: string,
  entries: { key: string; text: string }[],
  allowlist: string[],
  label: string,
): Promise<Record<string, string>> {
  const out = await callWithRetry(apiKey, locale, Object.fromEntries(entries.map((e) => [e.key, e.text])));
  const result: Record<string, string> = {};
  for (const e of entries) {
    let value = out[e.key];
    for (let retry = 0; (value === undefined || isGarbled(e.text, value, allowlist)) && retry < 2; retry++) {
      console.log(`  .. garbled/missing "${e.key}" (${locale}), individual retry ${retry + 1}: "${value}"`);
      const single = await callWithRetry(apiKey, locale, { [e.key]: e.text });
      value = single[e.key];
    }
    if (value === undefined || isGarbled(e.text, value, allowlist)) {
      skippedPairs.push(`${label} ${locale} ${e.key}`);
      console.log(`  !! SKIPPED (garbled after retries): ${e.key} -> "${value}"`);
      continue;
    }
    result[e.key] = value;
  }
  return result;
}

async function backfillAuthorityLinks(apiKey: string) {
  const links = await prisma.countryAuthorityLink.findMany({
    include: { country: { select: { code: true, defaultLocale: true } }, translations: true },
  });

  let plannedRows = 0;
  let skippedExisting = 0;

  for (const link of links) {
    const targetLocales = ALL_LOCALES.filter((l) => l !== link.country.defaultLocale);
    const existingLocales = new Set(link.translations.map((t) => t.locale));
    const allowlist = [link.name, link.abbreviation ?? "", ...GLOBAL_ALLOWLIST];

    for (const locale of targetLocales) {
      if (existingLocales.has(locale)) {
        skippedExisting++;
        console.log(`[AuthorityLink ${link.country.code}] ${link.name} -> ${locale}: already exists — skip`);
        continue;
      }

      console.log(`\n[AuthorityLink ${link.country.code}] ${link.name} -> ${locale}:`);
      // name/abbreviation are official proper names — copied verbatim, never sent to OpenAI.
      console.log(`  name (verbatim):         ${link.name}`);
      if (link.abbreviation) console.log(`  abbreviation (verbatim): ${link.abbreviation}`);

      let description: string | null = null;
      if (link.description) {
        const label = `[AuthorityLink ${link.country.code}] ${link.name}`;
        const out = await translateGuarded(apiKey, locale, [{ key: "description", text: link.description }], allowlist, label);
        if (out["description"] === undefined) continue; // garbled after retries — skip pair, don't write garbage
        description = out["description"];
        console.log(`  description:`);
        console.log(`    before: ${link.description}`);
        console.log(`    after:  ${description}`);
      }
      plannedRows++;

      if (APPLY) {
        await prisma.countryAuthorityLinkTranslation.create({
          data: {
            countryAuthorityLinkId: link.id,
            locale,
            name: link.name,
            abbreviation: link.abbreviation,
            description,
          },
        });
        console.log(`  [applied]`);
      }
    }
  }

  return { plannedRows, skippedExisting };
}

async function backfillLegalProfileTrust(apiKey: string) {
  const profiles = await prisma.countryLegalProfile.findMany({
    include: { country: { select: { code: true, defaultLocale: true } }, trustTranslations: true },
  });

  let plannedRows = 0;
  let skippedExisting = 0;

  for (const profile of profiles) {
    const targetLocales = ALL_LOCALES.filter((l) => l !== profile.country.defaultLocale);
    const existingLocales = new Set(profile.trustTranslations.map((t) => t.locale));
    const allowlist = [profile.regulatorName ?? "", ...GLOBAL_ALLOWLIST];

    const entries: { key: string; text: string }[] = [];
    if (profile.providerRegistrationLabel)
      entries.push({ key: "providerRegistrationLabel", text: profile.providerRegistrationLabel });
    if (profile.emergencyNotice) entries.push({ key: "emergencyNotice", text: profile.emergencyNotice });
    if (profile.dataProtectionLawName)
      entries.push({ key: "dataProtectionLawName", text: profile.dataProtectionLawName });

    if (!entries.length && !profile.regulatorName) {
      console.log(`[LegalProfile ${profile.country.code}] no translatable trust text — skip`);
      continue;
    }

    for (const locale of targetLocales) {
      if (existingLocales.has(locale)) {
        skippedExisting++;
        console.log(`[LegalProfile ${profile.country.code}] ${locale}: already exists — skip`);
        continue;
      }

      console.log(`\n[LegalProfile ${profile.country.code}] -> ${locale}:`);
      // regulatorName is an official proper name — copied verbatim, never sent to OpenAI.
      if (profile.regulatorName) console.log(`  regulatorName (verbatim): ${profile.regulatorName}`);

      const out = entries.length
        ? await translateGuarded(apiKey, locale, entries, allowlist, `[LegalProfile ${profile.country.code}]`)
        : {};
      for (const e of entries) {
        if (out[e.key] === undefined) continue;
        console.log(`  ${e.key}:`);
        console.log(`    before: ${e.text}`);
        console.log(`    after:  ${out[e.key]}`);
      }
      plannedRows++;

      if (APPLY) {
        await prisma.countryLegalProfileTrustTranslation.create({
          data: {
            legalProfileId: profile.id,
            locale,
            regulatorName: profile.regulatorName,
            providerRegistrationLabel: out["providerRegistrationLabel"] ?? null,
            emergencyNotice: out["emergencyNotice"] ?? null,
            dataProtectionLawName: out["dataProtectionLawName"] ?? null,
          },
        });
        console.log(`  [applied]`);
      }
    }
  }

  return { plannedRows, skippedExisting };
}

async function main() {
  const apiKey = loadApiKey();

  const authority = await backfillAuthorityLinks(apiKey);
  const trust = await backfillLegalProfileTrust(apiKey);

  console.log(
    `\n${APPLY ? "Applied" : "Dry-run"}: CountryAuthorityLinkTranslation ${authority.plannedRows} row(s) ${APPLY ? "written" : "would be written"}, ${authority.skippedExisting} skipped (already exist).`,
  );
  console.log(
    `${APPLY ? "Applied" : "Dry-run"}: CountryLegalProfileTrustTranslation ${trust.plannedRows} row(s) ${APPLY ? "written" : "would be written"}, ${trust.skippedExisting} skipped (already exist).`,
  );
  if (skippedPairs.length) {
    console.log(`\nGarbled pairs SKIPPED (not written):`);
    for (const p of skippedPairs) console.log(`  - ${p}`);
  } else {
    console.log(`\nNo garbled pairs.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
