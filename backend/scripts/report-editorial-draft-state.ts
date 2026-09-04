/**
 * READ-ONLY: current publication state of the Week 2 editorial cohort and any
 * other recently created blog record.
 *
 *   node --env-file=.env --import tsx scripts/report-editorial-draft-state.ts
 *
 * `docs/plans/content-drafts/week-2/README.md` records five parents left DRAFT
 * on 2026-08-29. This asks production what is true now.
 */
import { prisma, disconnectDb } from "../src/db/prisma.js";

const TOPICS = [
  "nemocensk",       // CZ sickness-pay calculation
  "illness-benefit", // IE payment/timing
  "baixa-medica",    // PT sickness benefit amount
  "carta-conducao",  // PT driving certificate
  "tension",         // ES urgent blood pressure
  "tensiunea",       // RO blood-pressure safety
];

async function main(): Promise<void> {
  const countries = await prisma.country.findMany({ select: { id: true, code: true } });
  const byId = new Map(countries.map((c) => [c.id, c.code.toUpperCase()]));

  const posts = await prisma.blogPost.findMany({
    where: { OR: TOPICS.map((slug) => ({ slug: { contains: slug, mode: "insensitive" as const } })) },
    select: {
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      countries: { select: { countryId: true } },
      translations: { select: { locale: true } },
    },
    orderBy: { slug: "asc" },
  });

  console.log("=== Week 2 editorial cohort, production state ===");
  for (const p of posts) {
    const markets = p.countries.map((c) => byId.get(c.countryId) ?? "??").join(",") || "(none)";
    const locales = p.translations.map((t) => t.locale).sort().join(",");
    console.log(
      `  ${p.status.padEnd(9)} ${markets.padEnd(6)} ${p.slug}\n` +
        `${"".padEnd(4)}published=${p.publishedAt?.toISOString().slice(0, 10) ?? "never"}  locales=[${locales}]`,
    );
  }
  console.log(`  matched: ${posts.length}`);

  const draftTotal = await prisma.blogPost.count({ where: { status: "DRAFT" } });
  const publishedTotal = await prisma.blogPost.count({ where: { status: "PUBLISHED" } });
  console.log(`\nAll blog posts: ${publishedTotal} PUBLISHED, ${draftTotal} DRAFT`);
  console.log("Read-only: nothing written.");
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
