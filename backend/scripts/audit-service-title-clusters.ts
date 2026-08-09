/**
 * On-page SEO batch (2026-08-09, continued): the previous audit found 288
 * indexable service seoTitle rows over the ~60-char search-display budget
 * and deferred them as "editorial debt, don't hardcode 288 URL-specific
 * strings." Per the follow-up instruction, cluster them by repeated wording
 * before writing that off — if the same phrase recurs across many rows it's
 * a systemic pattern worth fixing at the source, not 288 independent titles.
 *
 * Read-only. Prints cluster counts; writes nothing.
 */
import { prisma } from "../src/db/prisma.js";

const BRAND_PATTERN = / *[|·—-] *global health *$/i;

function unbrandedLen(title: string): number {
  return Array.from(title.replace(BRAND_PATTERN, "").trim()).length;
}

const PHRASES = [
  "online consultation",
  "online medical",
  "registered doctors",
  "registered clinicians",
  "licensed doctors",
  "specialists online",
  "same day",
  "same-day",
  "book now",
  "book online",
  "colegiados",
  "registados",
  "registrados",
  "inscritos",
  "clínicos gerais",
  "médicos de cabecera",
  "praktičtí lékaři",
  "registrovan",
  "medici de familie",
  "înregistrați",
  "autorizați",
  "consulta online",
  "consultation en ligne",
];

async function main() {
  const rows = await prisma.serviceTranslation.findMany({
    where: { seoTitle: { not: null } },
    select: {
      seoTitle: true,
      locale: true,
      service: { select: { slug: true, countryId: true, visibility: true } },
    },
  });

  const over = rows.filter((r) => r.seoTitle && unbrandedLen(r.seoTitle) > 60);
  console.log(`Total ServiceTranslation.seoTitle rows: ${rows.length}`);
  console.log(`Over 60-char unbranded budget: ${over.length}`);

  // Locale breakdown
  const byLocale = new Map<string, number>();
  for (const r of over) byLocale.set(r.locale, (byLocale.get(r.locale) ?? 0) + 1);
  console.log("\nBy locale:");
  for (const [locale, count] of [...byLocale.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${locale}: ${count}`);
  }

  // Phrase-cluster breakdown (a row can match multiple phrases)
  console.log("\nPhrase clusters (rows containing this phrase, case-insensitive):");
  const phraseCounts: Array<[string, number]> = [];
  for (const phrase of PHRASES) {
    const count = over.filter((r) => r.seoTitle!.toLowerCase().includes(phrase)).length;
    if (count > 0) phraseCounts.push([phrase, count]);
  }
  for (const [phrase, count] of phraseCounts.sort((a, b) => b[1] - a[1])) {
    console.log(`  "${phrase}": ${count}`);
  }

  const matchedAny = over.filter((r) =>
    PHRASES.some((p) => r.seoTitle!.toLowerCase().includes(p)),
  );
  console.log(`\nRows matching at least one known phrase: ${matchedAny.length} / ${over.length}`);
  console.log(`Rows matching NONE of the known phrases (genuinely unique): ${over.length - matchedAny.length}`);

  // Exact-duplicate-suffix clustering: strip the leading service-name part
  // (before the first " | ") and see how many rows share the SAME trailing
  // qualifier verbatim — that is the strongest signal of a shared template.
  const bySuffix = new Map<string, number>();
  for (const r of over) {
    const parts = r.seoTitle!.split("|");
    if (parts.length < 2) continue;
    const suffix = parts.slice(1).join("|").trim();
    bySuffix.set(suffix, (bySuffix.get(suffix) ?? 0) + 1);
  }
  const topSuffixes = [...bySuffix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log("\nTop shared trailing-qualifier suffixes (verbatim match after first '|'):");
  for (const [suffix, count] of topSuffixes) {
    console.log(`  [${count}x] "${suffix}"`);
  }

  console.log("\nSample of 15 over-budget titles (unbranded length shown):");
  for (const r of over.slice(0, 15)) {
    console.log(`  (${unbrandedLen(r.seoTitle!)}) [${r.locale}] ${r.seoTitle}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
