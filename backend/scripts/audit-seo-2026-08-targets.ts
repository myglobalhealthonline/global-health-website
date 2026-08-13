/**
 * Read-only: dump the current SEO copy for the pages the 2026-08-04 OpenSEO
 * live-data pass named as the highest-impact targets, so a patch can be written
 * against real BEFORE values instead of guesses.
 *
 * Targets (Ireland, all locales) and why:
 *   sick-certificate-ireland  — ranks #24 for "sick cert online" (880/mo, KD 0)
 *                               but its title is "Sick Leave Medical Assessment"
 *   full-blood-count          — #63 "fbc blood test" (880/mo), #81 "full blood count"
 *   thyroid-function-test     — #80 "thyroid test" (320/mo)
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-seo-2026-08-targets.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const COUNTRY = "ie";
const SLUGS = ["sick-certificate-ireland"];
const TEST_SLUGS = ["full-blood-count", "thyroid-function-test"];

const len = (v: string | null | undefined) => (v ? Array.from(v).length : 0);

async function main() {
  const services = await prisma.service.findMany({
    where: { country: { code: COUNTRY }, slug: { in: SLUGS } },
    select: {
      id: true,
      slug: true,
      name: true,
      seoTitle: true,
      seoDescription: true,
      translations: {
        select: { locale: true, name: true, seoTitle: true, seoDescription: true },
        orderBy: { locale: "asc" },
      },
    },
  });

  if (services.length === 0) {
    console.log(`No services matched ${SLUGS.join(", ")} for country ${COUNTRY}.`);
    return;
  }

  for (const s of services) {
    console.log(`\n=== ${s.slug}  (${s.id})`);
    console.log(`  name              ${s.name}`);
    console.log(`  base seoTitle     [${len(s.seoTitle)}] ${s.seoTitle ?? "(null)"}`);
    console.log(`  base seoDesc      [${len(s.seoDescription)}] ${s.seoDescription ?? "(null)"}`);
    for (const t of s.translations) {
      console.log(`  -- ${t.locale}`);
      console.log(`     name           ${t.name}`);
      console.log(`     seoTitle       [${len(t.seoTitle)}] ${t.seoTitle ?? "(null)"}`);
      console.log(`     seoDescription [${len(t.seoDescription)}] ${t.seoDescription ?? "(null)"}`);
    }
  }

  const missing = SLUGS.filter((slug) => !services.some((s) => s.slug === slug));
  if (missing.length > 0) console.log(`\nNOT a Service: ${missing.join(", ")}`);

  // The two lab pages are HealthTest rows, not Services.
  const tests = await prisma.healthTest.findMany({
    where: { country: { code: COUNTRY } },
    select: {
      id: true,
      title: true,
      seoTitle: true,
      seoDescription: true,
      translations: {
        select: { locale: true, title: true, seoTitle: true, seoDescription: true },
        orderBy: { locale: "asc" },
      },
    },
  });

  for (const t of tests) {
    console.log(`\n=== [healthTest] ${t.slug}  (${t.id})`);
    console.log(`  title             ${t.title}`);
    console.log(`  base seoTitle     [${len(t.seoTitle)}] ${t.seoTitle ?? "(null)"}`);
    console.log(`  base seoDesc      [${len(t.seoDescription)}] ${t.seoDescription ?? "(null)"}`);
    for (const tr of t.translations) {
      console.log(`  -- ${tr.locale}`);
      console.log(`     title          ${tr.title}`);
      console.log(`     seoTitle       [${len(tr.seoTitle)}] ${tr.seoTitle ?? "(null)"}`);
      console.log(`     seoDescription [${len(tr.seoDescription)}] ${tr.seoDescription ?? "(null)"}`);
    }
  }

  const missingTests: string[] = [];
  if (missingTests.length > 0) console.log(`\nNOT a HealthTest: ${missingTests.join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
