/**
 * Read-only: doctor professional titles that were never translated, i.e. the
 * same string is served for the English locale and for another language.
 *
 *   node --env-file=.env --import tsx scripts/audit-doctor-title-locale-gaps.ts
 */
import { prisma } from "../src/db/prisma.js";

async function main() {
  const doctors = await prisma.doctor.findMany({
    include: {
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
    orderBy: { fullName: "asc" },
  });

  let flagged = 0;
  for (const d of doctors) {
    const byLocale = new Map<string, string>();
    for (const t of d.translations) if (t.title?.trim()) byLocale.set(t.locale, t.title.trim());
    for (const dc of d.additionalCountries)
      for (const t of dc.translations)
        if (t.title?.trim()) byLocale.set(`${dc.country.code}/${t.locale}`, t.title.trim());

    const en = byLocale.get("EN");
    if (!en) continue;
    const same = [...byLocale.entries()].filter(
      ([k, v]) => !k.endsWith("EN") && v.toLowerCase() === en.toLowerCase(),
    );
    if (same.length) {
      flagged += 1;
      console.log(`${d.fullName} [${d.slug}] "${en}" also served for: ${same.map(([k]) => k).join(", ")}`);
    }
  }
  console.log(`\ndoctors with an untranslated title: ${flagged}/${doctors.length}`);
}

main().finally(() => prisma.$disconnect());
