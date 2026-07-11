import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const ALL_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;

async function main() {
  const countries = await prisma.country.findMany({
    select: {
      code: true,
      name: true,
      defaultLocale: true,
      countryLocales: { select: { locale: true, isDefault: true } },
    },
  });

  const enabledLocalesByCountry = new Map<string, string[]>();
  for (const c of countries) {
    const enabled = c.countryLocales.map((l) => l.locale);
    enabledLocalesByCountry.set(c.code, enabled.length ? enabled : [c.defaultLocale]);
  }

  console.log("=== Country -> enabled locales ===");
  for (const c of countries) {
    console.log(`  ${c.code} (${c.name}): default=${c.defaultLocale} enabled=[${enabledLocalesByCountry.get(c.code)?.join(",")}]`);
  }

  // ---- Services + ServiceTranslation ----
  const services = await prisma.service.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      visibility: true,
      country: { select: { code: true } },
      translations: { select: { locale: true } },
      faqs: {
        select: {
          id: true,
          question: true,
          isVisible: true,
          translations: { select: { locale: true } },
        },
      },
    },
  });

  console.log(`\n=== Services: ${services.length} total ===`);
  let servicesMissingTranslation = 0;
  let faqsTotal = 0;
  let faqsMissingTranslation = 0;
  const gapsByLocale: Record<string, number> = {};
  const serviceGapDetail: string[] = [];

  for (const s of services) {
    const enabled = (enabledLocalesByCountry.get(s.country.code) ?? ALL_LOCALES).filter((l) => l !== "EN" || true);
    const haveTranslation = new Set(s.translations.map((t) => t.locale));
    const missingForService = enabled.filter((l) => l !== s.country.code && !haveTranslation.has(l as any));
    // Determine base/default locale for this country to exclude (base row covers default locale)
    const country = countries.find((c) => c.code === s.country.code);
    const missingReal = enabled.filter((l) => l !== country?.defaultLocale && !haveTranslation.has(l as any));
    if (missingReal.length) {
      servicesMissingTranslation++;
      for (const l of missingReal) gapsByLocale[l] = (gapsByLocale[l] ?? 0) + 1;
      serviceGapDetail.push(`  [Service] ${s.country.code}/${s.slug} (${s.kind}, ${s.visibility}) missing: ${missingReal.join(",")}`);
    }

    for (const faq of s.faqs) {
      faqsTotal++;
      const faqHave = new Set(faq.translations.map((t) => t.locale));
      const faqMissing = enabled.filter((l) => l !== country?.defaultLocale && !faqHave.has(l as any));
      if (faqMissing.length) {
        faqsMissingTranslation++;
        for (const l of faqMissing) gapsByLocale[`FAQ:${l}`] = (gapsByLocale[`FAQ:${l}`] ?? 0) + 1;
      }
    }
  }

  console.log(`Services missing >=1 locale translation: ${servicesMissingTranslation} / ${services.length}`);
  console.log(`FAQs total: ${faqsTotal}, missing >=1 locale translation: ${faqsMissingTranslation}`);
  console.log("Gap counts by locale:", gapsByLocale);
  console.log("\nDetail (first 40):");
  for (const line of serviceGapDetail.slice(0, 40)) console.log(line);
  if (serviceGapDetail.length > 40) console.log(`  ...and ${serviceGapDetail.length - 40} more`);

  // ---- Doctors + DoctorFaq (locale is direct, no base/translation split) ----
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      slug: true,
      country: { select: { code: true } },
      translations: { select: { locale: true } },
      faqs: { select: { locale: true, isActive: true } },
    },
  });

  console.log(`\n=== Doctors: ${doctors.length} total ===`);
  let doctorsMissingTranslation = 0;
  let doctorsMissingFaqLocale = 0;
  for (const d of doctors) {
    const country = countries.find((c) => c.code === d.country.code);
    const enabled = (enabledLocalesByCountry.get(d.country.code) ?? ALL_LOCALES);
    const haveT = new Set(d.translations.map((t) => t.locale));
    const missingT = enabled.filter((l) => l !== country?.defaultLocale && !haveT.has(l as any));
    if (missingT.length) doctorsMissingTranslation++;

    const faqLocales = new Set(d.faqs.filter((f) => f.isActive).map((f) => f.locale));
    const missingFaqLocales = enabled.filter((l) => !faqLocales.has(l as any));
    if (d.faqs.length > 0 && missingFaqLocales.length) doctorsMissingFaqLocale++;
  }
  console.log(`Doctors missing >=1 profile translation: ${doctorsMissingTranslation} / ${doctors.length}`);
  console.log(`Doctors with FAQs but missing >=1 enabled locale (direct-locale model): ${doctorsMissingFaqLocale} / ${doctors.length}`);

  // ---- Doctor market profiles (DoctorCountry + DoctorMarketTranslation) ----
  const doctorCountries = await prisma.doctorCountry.findMany({
    where: { active: true, doctor: { active: true } },
    select: {
      id: true,
      doctor: { select: { slug: true } },
      country: { select: { code: true, defaultLocale: true } },
      translations: { select: { locale: true, title: true, bio: true } },
    },
  });

  function isMeaningful(value: string | null | undefined): boolean {
    if (!value?.trim()) return false;
    return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;
  }

  console.log(`\n=== Doctor market profiles: ${doctorCountries.length} total ===`);
  let marketsMissing = 0;
  const marketGapDetail: string[] = [];
  for (const market of doctorCountries) {
    const enabled = enabledLocalesByCountry.get(market.country.code) ?? ALL_LOCALES;
    const byLocale = new Map(market.translations.map((t) => [t.locale, t]));
    const missing = enabled.filter((l) => {
      if (l === market.country.defaultLocale) return false;
      const row = byLocale.get(l as any);
      return !isMeaningful(row?.title) || !isMeaningful(row?.bio);
    });
    if (missing.length) {
      marketsMissing++;
      marketGapDetail.push(`  [DoctorMarket] ${market.country.code}/${market.doctor.slug} missing bio/title: ${missing.join(",")}`);
    }
  }
  console.log(`Doctor market profiles missing >=1 enabled-locale bio/title: ${marketsMissing} / ${doctorCountries.length}`);
  console.log("Detail (first 40):");
  for (const line of marketGapDetail.slice(0, 40)) console.log(line);
  if (marketGapDetail.length > 40) console.log(`  ...and ${marketGapDetail.length - 40} more`);

  // ---- HealthTest + HealthTestTranslation + HealthTestFaq ----
  const tests = await prisma.healthTest.findMany({
    select: {
      id: true,
      slug: true,
      country: { select: { code: true } },
      translations: { select: { locale: true } },
      faqs: { select: { id: true } },
    },
  });
  console.log(`\n=== Health tests: ${tests.length} total ===`);
  let testsMissingTranslation = 0;
  let testFaqsTotal = 0;
  for (const t of tests) {
    const country = countries.find((c) => c.code === t.country.code);
    const enabled = (enabledLocalesByCountry.get(t.country.code) ?? ALL_LOCALES);
    const haveT = new Set(t.translations.map((x) => x.locale));
    const missingT = enabled.filter((l) => l !== country?.defaultLocale && !haveT.has(l as any));
    if (missingT.length) testsMissingTranslation++;
    testFaqsTotal += t.faqs.length;
  }
  console.log(`Health tests missing >=1 translation: ${testsMissingTranslation} / ${tests.length}`);
  console.log(`Health test FAQs total: ${testFaqsTotal} — NO per-locale translation table exists for HealthTestFaq (architecture gap, see report)`);

  // ---- Specialty + SpecialtyTranslation ----
  const specialties = await prisma.specialty.findMany({
    select: {
      id: true,
      slug: true,
      country: { select: { code: true } },
      translations: { select: { locale: true } },
    },
  });
  console.log(`\n=== Specialties: ${specialties.length} total ===`);
  let specialtiesMissing = 0;
  for (const sp of specialties) {
    const country = countries.find((c) => c.code === sp.country.code);
    const enabled = (enabledLocalesByCountry.get(sp.country.code) ?? ALL_LOCALES);
    const haveT = new Set(sp.translations.map((x) => x.locale));
    const missingT = enabled.filter((l) => l !== country?.defaultLocale && !haveT.has(l as any));
    if (missingT.length) specialtiesMissing++;
  }
  console.log(`Specialties missing >=1 translation: ${specialtiesMissing} / ${specialties.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
