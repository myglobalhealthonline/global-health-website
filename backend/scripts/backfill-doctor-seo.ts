/**
 * Backfill the doctor SEO fields that are blank in production:
 *
 *   1. `Asset.caption` + `Asset.description` on each doctor's live profile
 *      image (the newest active IMAGE row — the same one public reads pick).
 *      These render as the sr-only image byline (`aria-describedby`) and now
 *      also feed `ImageObject.caption` in the Physician JSON-LD.
 *   2. `DoctorTranslation.seoTitle` / `.seoDescription` per locale, and the
 *      same pair on `DoctorMarketTranslation` (per-market override rows).
 *      Both fall back to the English base columns at read time
 *      (`doctors.service.ts` `tr?.seoDescription ?? doctor.seoDescription`),
 *      so a blank row silently ships an ENGLISH meta description on a
 *      PT/ES/CS/RO/DE page. Filling them is a snippet/CTR fix, not a
 *      missing-tag fix.
 *
 * Copy is generated from data already in the row — the localized job title
 * (`DoctorTranslation.title`) plus a per-locale sentence template. No model
 * call, no invented credentials, and phrasing is deliberately genderless
 * ("Dr X — Pediatra em Portugal") so it is correct for every doctor.
 *
 * Only BLANK fields are written; anything an editor already wrote is left
 * alone, so the script is idempotent and safe to re-run.
 *
 * Dry run (default):
 *   node --env-file=.env --import tsx scripts/backfill-doctor-seo.ts
 * Apply:
 *   node --env-file=.env --import tsx scripts/backfill-doctor-seo.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { AssetKind } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
type Locale = (typeof LOCALES)[number];

/** "in <country>", already in the right case/preposition per language. */
const IN_COUNTRY: Record<Locale, Record<string, string>> = {
  EN: { ie: "in Ireland", pt: "in Portugal", es: "in Spain", ro: "in Romania", cz: "in Czechia", br: "in Brazil" },
  PT: {
    ie: "na Irlanda",
    pt: "em Portugal",
    es: "em Espanha",
    ro: "na Roménia",
    cz: "na República Checa",
    br: "no Brasil",
  },
  ES: { ie: "en Irlanda", pt: "en Portugal", es: "en España", ro: "en Rumanía", cz: "en Chequia", br: "en Brasil" },
  CS: { ie: "v Irsku", pt: "v Portugalsku", es: "ve Španělsku", ro: "v Rumunsku", cz: "v Česku", br: "v Brazílii" },
  RO: { ie: "în Irlanda", pt: "în Portugalia", es: "în Spania", ro: "în România", cz: "în Cehia", br: "în Brazilia" },
  DE: { ie: "in Irland", pt: "in Portugal", es: "in Spanien", ro: "in Rumänien", cz: "in Tschechien", br: "in Brasilien" },
};

const CTA: Record<Locale, string> = {
  EN: "Book an online video consultation with Global Health.",
  PT: "Marque uma videoconsulta online com a Global Health.",
  ES: "Reserve una videoconsulta en línea con Global Health.",
  CS: "Objednejte si online videokonzultaci s Global Health.",
  RO: "Programați o consultație online cu Global Health.",
  DE: "Buchen Sie eine Online-Videokonsultation mit Global Health.",
};

const blank = (v: string | null | undefined) => !v || v.trim() === "";

function metaDescription(name: string, title: string, locale: Locale, countryCode: string) {
  const where = IN_COUNTRY[locale][countryCode] ?? IN_COUNTRY[locale].ie;
  return `${name} — ${title} ${where}. ${CTA[locale]}`;
}

function metaTitle(name: string, title: string) {
  // Country name is omitted on purpose: it needs a different grammatical case
  // per language and the description already carries the market.
  return `${name} — ${title} | Global Health`;
}

type Change = { table: string; row: string; field: string; value: string };
const changes: Change[] = [];
const record = (table: string, row: string, field: string, value: string) =>
  changes.push({ table, row, field, value });

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { active: true },
    select: {
      id: true,
      slug: true,
      fullName: true,
      title: true,
      country: { select: { code: true, name: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { id: true, locale: true, title: true, seoTitle: true, seoDescription: true } },
      additionalCountries: {
        select: {
          id: true,
          country: { select: { code: true } },
          translations: { select: { id: true, locale: true, title: true, seoTitle: true, seoDescription: true } },
        },
      },
      assets: {
        where: { kind: AssetKind.IMAGE, isActive: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true, key: true, altText: true, title: true, caption: true, description: true },
      },
    },
    orderBy: [{ country: { code: "asc" } }, { slug: "asc" }],
  });

  const assetUpdates: { id: string; data: { caption?: string; description?: string } }[] = [];
  const translationUpdates: { id: string; data: { seoTitle?: string; seoDescription?: string } }[] = [];
  const marketUpdates: { id: string; data: { seoTitle?: string; seoDescription?: string } }[] = [];

  for (const d of doctors) {
    const home = d.country.code;
    const englishTitle = d.translations.find((t) => t.locale === "EN")?.title ?? d.title;

    // --- 1. profile image caption + description (English, sr-only byline) ---
    const asset = d.assets[0];
    if (asset) {
      const data: { caption?: string; description?: string } = {};
      if (blank(asset.caption)) {
        data.caption = `${d.fullName} — ${englishTitle}, Global Health ${d.country.name}`;
        record("Asset", d.slug, "caption", data.caption);
      }
      if (blank(asset.description)) {
        // No article before the title — some rows hold a field of practice
        // ("Family and Community Medicine"), where "is a …" reads wrong.
        data.description = `${d.fullName} — ${englishTitle} at Global Health ${d.country.name}. Book an online video consultation.`;
        record("Asset", d.slug, "description", data.description);
      }
      if (Object.keys(data).length > 0) assetUpdates.push({ id: asset.id, data });
    }

    // --- 2a. per-locale meta title/description on the base translation rows ---
    const enabled = new Set(d.country.countryLocales.map((l) => l.locale as string));
    for (const tr of d.translations) {
      if (!LOCALES.includes(tr.locale as Locale)) continue;
      // Only locales the doctor's own market actually serves.
      if (enabled.size > 0 && !enabled.has(tr.locale)) continue;
      const locale = tr.locale as Locale;
      const title = tr.title?.trim() || d.title;
      const data: { seoTitle?: string; seoDescription?: string } = {};
      if (blank(tr.seoTitle)) {
        data.seoTitle = metaTitle(d.fullName, title);
        record("DoctorTranslation", `${d.slug}/${locale}`, "seoTitle", data.seoTitle);
      }
      if (blank(tr.seoDescription)) {
        data.seoDescription = metaDescription(d.fullName, title, locale, home);
        record("DoctorTranslation", `${d.slug}/${locale}`, "seoDescription", data.seoDescription);
      }
      if (Object.keys(data).length > 0) translationUpdates.push({ id: tr.id, data });
    }

    // --- 2b. same pair on the per-market override rows ---
    for (const dc of d.additionalCountries) {
      const market = dc.country.code;
      for (const tr of dc.translations) {
        if (!LOCALES.includes(tr.locale as Locale)) continue;
        const locale = tr.locale as Locale;
        const title =
          tr.title?.trim() ||
          d.translations.find((t) => t.locale === locale)?.title?.trim() ||
          d.title;
        const data: { seoTitle?: string; seoDescription?: string } = {};
        if (blank(tr.seoTitle)) {
          data.seoTitle = metaTitle(d.fullName, title);
          record("DoctorMarketTranslation", `${d.slug}@${market}/${locale}`, "seoTitle", data.seoTitle);
        }
        if (blank(tr.seoDescription)) {
          data.seoDescription = metaDescription(d.fullName, title, locale, market);
          record("DoctorMarketTranslation", `${d.slug}@${market}/${locale}`, "seoDescription", data.seoDescription);
        }
        if (Object.keys(data).length > 0) marketUpdates.push({ id: tr.id, data });
      }
    }
  }

  for (const c of changes) {
    console.log(`${c.table.padEnd(26)} ${c.row.padEnd(34)} ${c.field.padEnd(15)} ${c.value}`);
  }
  console.log(
    `\n${APPLY ? "APPLY" : "DRY RUN"} — ${doctors.length} active doctors · asset rows ${assetUpdates.length} · DoctorTranslation ${translationUpdates.length} · DoctorMarketTranslation ${marketUpdates.length} · ${changes.length} field writes`,
  );

  if (!APPLY) {
    console.log("Re-run with --apply to write.");
    return;
  }

  // Sequential, not one transaction: ~440 updates over the Railway proxy blow
  // the 5s interactive-transaction budget, and every write is a blank-only
  // fill, so a partial run is safe to simply re-run.
  let done = 0;
  for (const u of assetUpdates) {
    await prisma.asset.update({ where: { id: u.id }, data: u.data });
    done += 1;
  }
  for (const u of translationUpdates) {
    await prisma.doctorTranslation.update({ where: { id: u.id }, data: u.data });
    done += 1;
  }
  for (const u of marketUpdates) {
    await prisma.doctorMarketTranslation.update({ where: { id: u.id }, data: u.data });
    done += 1;
  }
  console.log(`written — ${done} rows updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
