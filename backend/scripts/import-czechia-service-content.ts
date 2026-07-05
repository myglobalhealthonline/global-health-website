/**
 * Import the Czech Republic (CZ) service-page content, parsed from
 * "CZ_GeneralConsultation_EN_CS_v3.docx" (a 15-service bilingual bundle,
 * July 2026) into new CZ Service rows.
 *
 *   node --env-file=.env --import tsx scripts/import-czechia-service-content.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/import-czechia-service-content.ts --apply    # create
 *
 * Source data lives in 15 per-service JSON files at
 * <scratchpad>/cz-svc-NN-<name>.json (path below), each holding the CS + EN
 * content verbatim from the docx plus DE/ES/PT/RO translations of the EN
 * version. CZ's defaultLocale is CS, so the Service base columns get the CS
 * copy and ServiceTranslation rows cover EN/DE/ES/PT/RO. ServiceFaq has no
 * locale column (platform-wide limitation — see ServiceTranslation schema
 * comment), so FAQs are seeded in Czech only, matching the PT precedent
 * (FAQs in the country's default-locale content).
 *
 * All 15 are created INACTIVE (isActive: false) — admin sets price/duration
 * and publishes each from /admin/services once reviewed.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocaleCode, ServiceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const COUNTRY_CODE = "cz";
const DATA_DIR =
  "C:\\Users\\kingh\\AppData\\Local\\Temp\\claude\\C--Users-kingh-Desktop-NashaaFrontend-global-health-website\\abcee1dd-d2fb-4a6a-8111-58a67d5d61bb\\scratchpad";

const APPLY = process.argv.includes("--apply");

type LocaleContent = {
  name: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  heroTitle: string;
  heroDescription: string;
  detailBodyHtml: string;
};

type Entry = {
  index: number;
  slug: string;
  kind: string;
  locales: Record<"CS" | "EN" | "DE" | "ES" | "PT" | "RO", LocaleContent>;
  faqs: Array<{ question: string; answer: string }>;
};

const TRANSLATION_LOCALES: Array<Exclude<keyof Entry["locales"], "CS">> = [
  "EN",
  "DE",
  "ES",
  "PT",
  "RO",
];

function loadEntries(): Entry[] {
  const files = readdirSync(DATA_DIR)
    .filter((f) => /^cz-svc-\d{2}-.+\.json$/.test(f))
    .sort();
  if (files.length !== 15) {
    console.warn(`WARNING: expected 15 cz-svc-*.json files, found ${files.length}: ${files.join(", ")}`);
  }
  return files.map((f) => JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf-8")) as Entry);
}

async function main() {
  const entries = loadEntries().sort((a, b) => a.index - b.index);

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, currency: { select: { code: true } } },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  const existing = await prisma.service.findMany({
    where: { countryId: country.id },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((s) => s.slug));

  const slugsSeen = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const e of entries) {
    const cs = e.locales.CS;
    const detailBody = sanitizeRichHtml(cs.detailBodyHtml);
    const dup = slugsSeen.has(e.slug) || existingSlugs.has(e.slug);
    slugsSeen.add(e.slug);

    console.log(
      `${(dup ? "SKIP-DUP" : "CREATE").padEnd(9)} #${String(e.index).padStart(2, "0")} ${e.slug.padEnd(35)} faqs=${e.faqs.length} body=${detailBody?.length ?? 0} locales=${Object.keys(e.locales).join(",")}`,
    );

    if (dup) {
      skipped += 1;
      continue;
    }
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      const svc = await tx.service.create({
        data: {
          countryId: country.id,
          kind: (e.kind as ServiceKind) ?? ServiceKind.GENERAL,
          slug: e.slug,
          name: cs.name,
          summary: cs.summary,
          seoTitle: cs.seoTitle,
          seoDescription: cs.seoDescription,
          seoKeywords: cs.seoKeywords ?? [],
          heroTitle: cs.heroTitle,
          heroDescription: cs.heroDescription,
          detailBody,
          currencyCode: country.currency.code,
          isActive: false, // draft — admin sets price/duration before publishing
        },
        select: { id: true },
      });

      if (e.faqs.length > 0) {
        await tx.serviceFaq.createMany({
          data: e.faqs.map((f, i) => ({
            serviceId: svc.id,
            question: f.question,
            answer: f.answer,
            sortOrder: i,
            isVisible: true,
          })),
        });
      }

      for (const locale of TRANSLATION_LOCALES) {
        const t = e.locales[locale];
        if (!t) continue;
        await tx.serviceTranslation.create({
          data: {
            serviceId: svc.id,
            locale: locale as LocaleCode,
            name: t.name,
            summary: t.summary,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            heroTitle: t.heroTitle,
            heroDescription: t.heroDescription,
            detailBody: sanitizeRichHtml(t.detailBodyHtml),
          },
        });
      }
    });
    created += 1;
  }

  console.log("\n────────────");
  console.log(`total ${entries.length}`);
  if (APPLY) {
    console.log(`APPLIED: created ${created}, skipped (duplicate slug) ${skipped}`);
  } else {
    console.log(`DRY-RUN (no writes). Would create ${entries.length - skipped}, skip ${skipped} duplicate slug(s). Pass --apply.`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
