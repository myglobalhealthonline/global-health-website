/**
 * Import the Brazil (BR) service-page content, parsed from
 * "serviços brazil.docx" (18-service bilingual bundle: all GENERAL/GP tier,
 * PT-BR + EN, July 2026) into new BR Service rows.
 *
 *   node --env-file=.env --import tsx scripts/import-brazil-service-content.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/import-brazil-service-content.ts --apply    # create
 *
 * Source data lives in backend/scripts/data/brazil-service-content.json, one
 * entry per service with locales.PT (base — PT is Brazil's defaultLocale,
 * shared with Portugal at the enum level but scoped per-country via
 * countryId) and locales.EN (translation). ServiceFaq has no locale column
 * (platform-wide limitation), so FAQs are seeded in Portuguese only, matching
 * the PT/CZ/ES precedent (FAQs in the country's default-locale content).
 *
 * All 18 are created INACTIVE (isActive: false) — admin sets price/duration
 * and publishes each from /admin/services once reviewed.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocaleCode, ServiceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const COUNTRY_CODE = "br";
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "data", "brazil-service-content.json");

const APPLY = process.argv.includes("--apply");

type LocaleContent = {
  name: string;
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
  locales: { PT: LocaleContent; EN: LocaleContent };
  faqs: Array<{ question: string; answer: string }>;
};

function loadEntries(): Entry[] {
  const entries = JSON.parse(readFileSync(DATA, "utf-8")) as Entry[];
  if (entries.length !== 18) {
    console.warn(`WARNING: expected 18 entries, found ${entries.length}`);
  }
  return entries;
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
    const pt = e.locales.PT;
    const detailBody = sanitizeRichHtml(pt.detailBodyHtml);
    const dup = slugsSeen.has(e.slug) || existingSlugs.has(e.slug);
    slugsSeen.add(e.slug);

    console.log(
      `${(dup ? "SKIP-DUP" : "CREATE").padEnd(9)} #${String(e.index).padStart(2, "0")} ${e.slug.padEnd(32)} faqs=${e.faqs.length} body=${detailBody?.length ?? 0}`,
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
          name: pt.name,
          seoTitle: pt.seoTitle,
          seoDescription: pt.seoDescription,
          seoKeywords: pt.seoKeywords ?? [],
          heroTitle: pt.heroTitle,
          heroDescription: pt.heroDescription,
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

      const en = e.locales.EN;
      if (en) {
        await tx.serviceTranslation.create({
          data: {
            serviceId: svc.id,
            locale: LocaleCode.EN,
            name: en.name,
            seoTitle: en.seoTitle,
            seoDescription: en.seoDescription,
            heroTitle: en.heroTitle,
            heroDescription: en.heroDescription,
            detailBody: sanitizeRichHtml(en.detailBodyHtml),
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
    console.log(
      `DRY-RUN (no writes). Would create ${entries.length - skipped}, skip ${skipped} duplicate slug(s). Pass --apply.`,
    );
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
