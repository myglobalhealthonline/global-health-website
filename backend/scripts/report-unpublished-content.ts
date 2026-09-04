/**
 * READ-ONLY inventory of content that exists but is NOT publicly live.
 *
 *   node --env-file=.env --import tsx scripts/report-unpublished-content.ts
 *
 * Opens no write, runs no transaction, mutates nothing. Answers one question:
 * what has been created but never made visible in production, per country.
 *
 * "Not live" means any of: PublishStatus.DRAFT, isActive false, or a
 * non-PUBLIC visibility — each of which keeps a record off the public site.
 */
import { prisma, disconnectDb } from "../src/db/prisma.js";

const line = (label: string, value: unknown) => console.log(`  ${label.padEnd(46)} ${String(value)}`);

async function main(): Promise<void> {
  const countries = await prisma.country.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const byId = new Map(countries.map((c) => [c.id, c.code.toUpperCase()]));
  console.log(`Countries: ${countries.map((c) => c.code).join(", ")}\n`);

  console.log("=== SERVICES not publicly live ===");
  const services = await prisma.service.findMany({
    where: { OR: [{ isActive: false }, { visibility: { not: "PUBLIC" } }] },
    select: { slug: true, countryId: true, isActive: true, visibility: true, basePriceCents: true },
    orderBy: [{ countryId: "asc" }, { slug: "asc" }],
  });
  if (services.length === 0) console.log("  (none)");
  for (const s of services) {
    line(
      `${byId.get(s.countryId) ?? "??"}  ${s.slug}`,
      `active=${s.isActive} visibility=${s.visibility} price=${s.basePriceCents ?? "unset"}`,
    );
  }
  console.log(`  TOTAL: ${services.length}\n`);

  console.log("=== PAGE CONTENT not published ===");
  const pages = await prisma.pageContent.findMany({
    where: { OR: [{ status: "DRAFT" }, { isActive: false }] },
    select: { pageKey: true, countryId: true, status: true, isActive: true },
    orderBy: [{ countryId: "asc" }, { pageKey: "asc" }],
  });
  if (pages.length === 0) console.log("  (none)");
  for (const p of pages) {
    line(`${byId.get(p.countryId) ?? "??"}  ${p.pageKey}`, `status=${p.status} active=${p.isActive}`);
  }
  console.log(`  TOTAL: ${pages.length}\n`);

  console.log("=== BLOG POSTS not published ===");
  const posts = await prisma.blogPost.findMany({
    where: { status: "DRAFT" },
    select: { slug: true, status: true, countries: { select: { countryId: true } } },
    orderBy: { slug: "asc" },
  });
  if (posts.length === 0) console.log("  (none)");
  for (const b of posts) {
    const markets = b.countries.map((c) => byId.get(c.countryId) ?? "??").join(",") || "(no market)";
    line(`${markets}  ${b.slug}`, `status=${b.status}`);
  }
  console.log(`  TOTAL: ${posts.length}\n`);

  console.log("=== SEO LANDING PAGES not publicly live ===");
  const landings = await prisma.seoLandingPage.findMany({
    where: { isPublished: false },
    select: { slug: true, countryId: true, isPublished: true },
    orderBy: [{ countryId: "asc" }, { slug: "asc" }],
  });
  if (landings.length === 0) console.log("  (none)");
  for (const l of landings) line(`${byId.get(l.countryId) ?? "??"}  ${l.slug}`, `published=${l.isPublished}`);
  console.log(`  TOTAL: ${landings.length}\n`);

  console.log("=== HEALTH TESTS not publicly live ===");
  const tests = await prisma.healthTest.findMany({
    where: { isActive: false },
    select: { slug: true, countryId: true },
    orderBy: [{ countryId: "asc" }, { slug: "asc" }],
  });
  if (tests.length === 0) console.log("  (none)");
  for (const t of tests) line(`${byId.get(t.countryId) ?? "??"}  ${t.slug}`, "active=false");
  console.log(`  TOTAL: ${tests.length}`);

  console.log("\nRead-only: no write, no transaction, nothing mutated.");
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
