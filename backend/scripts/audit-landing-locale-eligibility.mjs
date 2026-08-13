// Read-only audit (international-locale batch, 2026-08-09): for every
// published SEO landing page, compares the OLD sitemap behavior (every
// country-supported locale submitted, regardless of translation) against the
// NEW behavior (frontend/lib/seo/landing-locale-eligibility.ts's
// eligibleLandingLocales — only locales with a real translation row AND a
// current CountryLocale row). Prints per-country before/after counts and
// which locale variants were dropped. No writes.
import { prisma } from "../src/db/prisma.js";

function eligibleLandingLocales(availableLocales, supportedLocales, defaultLocale) {
  const available = new Set(availableLocales.map((l) => l.toLowerCase()));
  const def = defaultLocale.toLowerCase();
  const supported = supportedLocales.length > 0 ? supportedLocales.map((l) => l.toLowerCase()) : [def];
  const ordered = [def, ...supported.filter((l) => l !== def)];
  return ordered.filter((l) => available.has(l));
}

const countries = await prisma.country.findMany({
  where: { isActive: true },
  select: {
    code: true,
    name: true,
    defaultLocale: true,
    countryLocales: { select: { locale: true } },
    seoLandingPages: {
      where: { isPublished: true },
      select: { slug: true, translations: { select: { locale: true } } },
    },
  },
});

let totalBefore = 0;
let totalAfter = 0;
let totalDropped = 0;
const rows = [];

for (const country of countries) {
  const supportedLocales = country.countryLocales.map((l) => l.locale.toLowerCase());
  const defaultLocale = country.defaultLocale.toLowerCase();
  const langs = supportedLocales.length > 0 ? supportedLocales : [defaultLocale];

  let before = 0;
  let after = 0;
  const droppedUrls = [];

  for (const page of country.seoLandingPages) {
    const availableLocales = [...new Set(page.translations.map((t) => t.locale.toLowerCase()))];
    // OLD: every supported locale was submitted regardless of translation.
    before += langs.length;
    const eligible = eligibleLandingLocales(availableLocales, supportedLocales, defaultLocale);
    after += eligible.length;
    for (const lang of langs) {
      if (!eligible.includes(lang)) {
        droppedUrls.push(`/${country.code}/${lang}/health/${page.slug}`);
      }
    }
  }

  totalBefore += before;
  totalAfter += after;
  totalDropped += droppedUrls.length;
  rows.push({ country: country.code, name: country.name, pages: country.seoLandingPages.length, before, after, dropped: droppedUrls.length, droppedUrls });
}

console.log("Landing-page sitemap URL count, before vs after eligibleLandingLocales:\n");
console.log("country  pages  before  after  dropped(fallback-only)");
for (const r of rows) {
  console.log(`${r.country.padEnd(8)} ${String(r.pages).padEnd(6)} ${String(r.before).padEnd(7)} ${String(r.after).padEnd(6)} ${r.dropped}`);
}
console.log(`\nTOTAL: before=${totalBefore} after=${totalAfter} dropped=${totalDropped}`);

console.log("\nDropped URLs (were submitted with fallback-locale content, now excluded):");
for (const r of rows) {
  for (const u of r.droppedUrls) console.log(`  ${u}`);
}

await prisma.$disconnect();
