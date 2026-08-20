/** Read-only: which locales a doctor actually has content for. */
import { prisma } from "../src/db/prisma.js";

async function main() {
  const slug = process.argv[2];
  const d = await prisma.doctor.findFirst({
    where: { slug },
    include: {
      country: true,
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
  });
  if (!d) throw new Error(`no doctor ${slug}`);
  console.log(`${d.fullName} | base country=${d.country.code} | defaultLocale=${d.country.defaultLocale}`);
  console.log(`Doctor.title="${d.title}" bio=${d.bio?.length ?? 0}`);
  for (const t of d.translations)
    console.log(
      `  DoctorTranslation ${t.locale}: title="${t.title}" bio=${t.bio?.length ?? 0} seoTitle=${t.seoTitle ? "y" : "n"}`,
    );
  for (const dc of d.additionalCountries) {
    console.log(`  DoctorCountry ${dc.country.code} locales=${dc.country.supportedLocales ?? "?"}`);
    for (const t of dc.translations)
      console.log(
        `    Market ${dc.country.code}/${t.locale}: title="${t.title ?? ""}" bio=${t.bio?.length ?? 0}`,
      );
  }
}

main().finally(() => prisma.$disconnect());
