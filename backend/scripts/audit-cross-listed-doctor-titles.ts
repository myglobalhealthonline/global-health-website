/**
 * Read-only verification for the cross-listed-doctor duplicate-title fix
 * (frontend/lib/seo/doctor-market-title.ts).
 *
 * For every doctor listed in more than one country (primary Doctor.countryId
 * plus any active DoctorCountry row — the SAME relation the public API joins
 * on), prints old title -> new title for each market, mirroring
 * `withMarketTitle`'s logic exactly so this is a verification of the shipped
 * rule, not a second implementation of it.
 *
 * Run: node --env-file=.env --import tsx scripts/audit-cross-listed-doctor-titles.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

function titleMentionsCountry(title: string, country: string): boolean {
  const escaped = country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(title);
}

function withMarketTitle(baseTitle: string, currentCountry: string, marketCount: number): string {
  if (marketCount <= 1) return baseTitle;
  if (titleMentionsCountry(baseTitle, currentCountry)) return baseTitle;
  return `${baseTitle} · ${currentCountry}`;
}

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { active: true },
    select: {
      slug: true,
      fullName: true,
      title: true,
      seoTitle: true,
      country: { select: { code: true, name: true } },
      additionalCountries: {
        where: { active: true },
        select: { country: { select: { code: true, name: true } } },
      },
    },
    orderBy: { slug: "asc" },
  });

  // `additionalCountries` carries a self-referencing row for the doctor's own
  // primary country for some legacy records (the "self-market-row" quirk —
  // see project memory on the Spain doctors brief), so a genuine EXTRA market
  // is one whose country code differs from the primary `Doctor.countryId`.
  const withMarkets = doctors.map((d) => {
    const extra = d.additionalCountries
      .map((ac) => ac.country)
      .filter((c) => c.code !== d.country.code);
    const seen = new Set<string>();
    const markets = [d.country, ...extra].filter((m) => {
      if (seen.has(m.code)) return false;
      seen.add(m.code);
      return true;
    });
    return { ...d, markets };
  });
  const crossListed = withMarkets.filter((d) => d.markets.length > 1);

  console.log(`Total active doctors: ${doctors.length}`);
  console.log(`Cross-listed (2+ markets): ${crossListed.length}\n`);

  let urlCount = 0;
  for (const d of crossListed) {
    const markets = d.markets;
    const baseTitle = d.seoTitle ?? `${d.fullName} · ${d.title} · ${d.country.name}`;
    console.log(`${d.slug}  (${markets.map((m) => m.code).join(", ")})`);
    for (const m of markets) {
      const newTitle = withMarketTitle(baseTitle, m.name, markets.length);
      urlCount += 1;
      console.log(`  [${m.code}] old: "${baseTitle}"`);
      console.log(`  [${m.code}] new: "${newTitle}"${newTitle === baseTitle ? "  (unchanged)" : ""}`);
    }
    console.log("");
  }
  console.log(`Cross-listed doctor-market URLs: ${urlCount}`);

  const singleMarket = withMarkets.length - crossListed.length;
  console.log(`Single-market doctors (title untouched): ${singleMarket}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
