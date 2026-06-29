/**
 * Seed the Ireland SEO landing pages (Internal-Linking spec, Rule 6) as DRAFTS.
 * The spec lists the slugs + audience; full body copy is authored later in
 * admin. Each page is created unpublished with a starter title/SEO/body.
 *
 *   node --import tsx scripts/import-ireland-landing-pages.ts          # dry-run
 *   node --import tsx scripts/import-ireland-landing-pages.ts --apply
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");
const here = path.dirname(fileURLToPath(import.meta.url));
void here;

const PAGES: Array<{
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  bodyHtml: string;
}> = [
  {
    slug: "hypertension",
    title: "High Blood Pressure (Hypertension) Care in Ireland",
    seoTitle: "Hypertension Care Ireland | Online Doctor",
    seoDescription:
      "Manage high blood pressure with an Irish-registered doctor online. Reviews, lifestyle guidance, and ongoing care via secure video call.",
    bodyHtml:
      "<h2>Manage hypertension from home</h2><p>Speak with an Irish-registered doctor about high blood pressure — assessment, lifestyle guidance, and ongoing review via secure video call.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "diabetes",
    title: "Diabetes Care in Ireland",
    seoTitle: "Diabetes Care Ireland | Online Doctor",
    seoDescription:
      "Ongoing diabetes management with an Irish-registered doctor online — blood-sugar review, lifestyle support, and coordinated care.",
    bodyHtml:
      "<h2>Ongoing diabetes care, online</h2><p>Review your diabetes management with an Irish-registered doctor via secure video call.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "respiratory-infections",
    title: "Respiratory Infections — Online Doctor Ireland",
    seoTitle: "Respiratory Infection Doctor Ireland | Same-Day",
    seoDescription:
      "Chest infections, persistent cough, and respiratory symptoms assessed by an Irish-registered doctor — same-day video appointments.",
    bodyHtml:
      "<h2>Respiratory symptoms assessed today</h2><p>Get a same-day assessment of chest infections, cough, and respiratory symptoms from an Irish-registered doctor.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "migraine",
    title: "Migraine Assessment & Management in Ireland",
    seoTitle: "Migraine Doctor Ireland | Online Assessment",
    seoDescription:
      "Migraine and severe headache assessment with an Irish-registered doctor online — management plans and referral where needed.",
    bodyHtml:
      "<h2>Migraine assessment, online</h2><p>Have your migraines assessed and managed by an Irish-registered doctor via secure video call.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "arabic-speaking-doctor",
    title: "Arabic-Speaking Doctor in Ireland",
    seoTitle: "Arabic-Speaking Doctor Ireland | Online Consultation",
    seoDescription:
      "See an Arabic-speaking, Irish-registered doctor online. Consultations in Arabic for Ireland's Arabic-speaking community.",
    bodyHtml:
      "<h2>Consultations in Arabic</h2><p>Speak with an Arabic-speaking, Irish-registered doctor via secure video call.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "international-students",
    title: "Healthcare for International Students in Ireland",
    seoTitle: "Doctor for International Students Ireland | Online",
    seoDescription:
      "Online healthcare for international students in Ireland — no local GP registration required. Same-day, multi-lingual consultations.",
    bodyHtml:
      "<h2>Healthcare for international students</h2><p>No local GP? International students can see an Irish-registered doctor online, same day, in several languages.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
  {
    slug: "expat-healthcare",
    title: "Healthcare for Expats in Ireland",
    seoTitle: "Expat Healthcare Ireland | Online Doctor",
    seoDescription:
      "Online healthcare for expats and international residents in Ireland — no local GP registration needed. Multi-lingual, same-day care.",
    bodyHtml:
      "<h2>Healthcare for expats in Ireland</h2><p>Expats and international residents can access an Irish-registered doctor online — no local GP registration required.</p><p>Draft page — expand with on-page copy in admin.</p>",
  },
];

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, defaultLocale: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const locale = country.defaultLocale as LocaleCode;

  let count = 0;
  for (const p of PAGES) {
    const existing = await prisma.seoLandingPage.findUnique({
      where: { countryId_slug: { countryId: country.id, slug: p.slug } },
      select: { id: true },
    });
    console.log(`${existing ? "UPDATE" : "CREATE"}  /health/${p.slug}  "${p.title}"`);
    if (!APPLY) {
      count += 1;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const page = await tx.seoLandingPage.upsert({
        where: { countryId_slug: { countryId: country.id, slug: p.slug } },
        create: { countryId: country.id, slug: p.slug, isPublished: false, sortOrder: count },
        update: {}, // keep publish state / order if it already exists
        select: { id: true },
      });
      await tx.seoLandingPageTranslation.deleteMany({ where: { landingPageId: page.id } });
      await tx.seoLandingPageTranslation.create({
        data: {
          landingPageId: page.id,
          locale,
          title: p.title,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          bodyHtml: p.bodyHtml,
        },
      });
    });
    count += 1;
  }

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${count} landing pages upserted (drafts — publish in admin).`
      : `DRY-RUN: ${count} landing pages would be upserted as drafts. Pass --apply.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
