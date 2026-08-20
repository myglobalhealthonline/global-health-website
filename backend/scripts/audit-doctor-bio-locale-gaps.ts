/**
 * Read-only: find doctor/locale pairs whose bio is missing, so the public
 * profile falls back to another language.
 *
 *   node --env-file=.env --import tsx scripts/audit-doctor-bio-locale-gaps.ts
 */
import { prisma } from "../src/db/prisma.js";

async function main() {
  const doctors = await prisma.doctor.findMany({
    include: {
      country: true,
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const gaps: string[] = [];
  for (const d of doctors) {
    // Locales this doctor is expected to serve: every locale that already has
    // a translation row (title translated) or a market row.
    const locales = new Set<string>();
    for (const t of d.translations) locales.add(t.locale);
    for (const dc of d.additionalCountries)
      for (const t of dc.translations) locales.add(t.locale);

    for (const locale of [...locales].sort()) {
      const t = d.translations.find((x) => x.locale === locale);
      const markets = d.additionalCountries
        .map((dc) => ({
          code: dc.country.code,
          row: dc.translations.find((x) => x.locale === locale),
        }))
        .filter((m) => m.row);

      const hasDoctorBio = Boolean(t?.bio?.trim());
      // What the public page actually shows: the market row for that country
      // if it has a bio, else the doctor-level translation. Both empty means
      // the page falls back to another language.
      const blindCountries = markets
        .filter((m) => !m.row!.bio?.trim() && !hasDoctorBio)
        .map((m) => m.code);
      if (blindCountries.length) {
        gaps.push(`${d.fullName} [${d.slug}] ${locale}: no bio for ${blindCountries.join(",")}`);
      }
    }
  }

  console.log(`doctors=${doctors.length} gap rows=${gaps.length}`);
  for (const g of gaps) console.log("  " + g);
}

main().finally(() => prisma.$disconnect());
