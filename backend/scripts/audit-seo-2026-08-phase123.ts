/**
 * Read-only: current SEO copy for the Phase 1-3 targets of the 2026-08-04
 * OpenSEO pass, so the patches can be written against real BEFORE values.
 *
 * Phase 1 — sick-leave head terms:
 *   BlogPost  sick-certificate-ireland-employee-rights  (#75 "sick leave ireland",
 *             5,400/mo KD 15; #75 "long term sick leave rights ireland", 320)
 * Phase 2 — lab tests:
 *   HealthTest Ireland rows — copy depth for "fbc blood test" (880, #63),
 *             "full blood count" (390, #81), "thyroid test" (320, #80)
 * Phase 3 — brand CTR:
 *   PageContentTranslation HOME, country ie — ~1,200 impressions at position
 *             8-12 on "clinic global health" / "global health clinic" /
 *             "global health medical services" converting at ~0%.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-seo-2026-08-phase123.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const COUNTRY = "ie";
const BLOG_SLUG = "sick-certificate-ireland-employee-rights";

const len = (v: string | null | undefined) => (v ? Array.from(v).length : 0);
const words = (v: string | null | undefined) =>
  v ? v.replace(/<[^>]*>/g, " ").split(/\s+/u).filter(Boolean).length : 0;

async function main() {
  console.log("########## PHASE 1 — blog post\n");
  const posts = await prisma.blogPost.findMany({
    where: { slug: BLOG_SLUG },
    select: {
      id: true,
      slug: true,
      locale: true,
      status: true,
      title: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      ctaServiceId: true,
      country: { select: { code: true } },
      translations: {
        select: { id: true, locale: true, title: true, slug: true, seoTitle: true, seoDesc: true },
        orderBy: { locale: "asc" },
      },
    },
  });
  for (const p of posts) {
    console.log(`=== ${p.slug} [${p.locale}] country=${p.country?.code ?? "-"} ${p.status} (${p.id})`);
    console.log(`  title          ${p.title}`);
    console.log(`  body words     ${words(p.body)}`);
    console.log(`  ctaServiceId   ${p.ctaServiceId ?? "(null)"}`);
    console.log(`  seoTitle       [${len(p.seoTitle)}] ${p.seoTitle ?? "(null)"}`);
    console.log(`  seoDescription [${len(p.seoDescription)}] ${p.seoDescription ?? "(null)"}`);
    for (const t of p.translations) {
      console.log(`  -- ${t.locale}  slug=${t.slug}`);
      console.log(`     seoTitle    [${len(t.seoTitle)}] ${t.seoTitle ?? "(null)"}`);
      console.log(`     seoDesc     [${len(t.seoDesc)}] ${t.seoDesc ?? "(null)"}`);
    }
  }
  if (posts.length === 0) console.log(`(no BlogPost with slug ${BLOG_SLUG})`);

  console.log("\n\n########## PHASE 2 — Ireland health tests\n");
  const tests = await prisma.healthTest.findMany({
    where: { country: { code: COUNTRY } },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      detailIntro: true,
      whatThisTestCovers: true,
      whyGetTested: true,
      seoTitle: true,
      seoDescription: true,
      isActive: true,
      faqs: { select: { id: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  for (const t of tests) {
    console.log(
      `=== ${t.title}${t.isActive ? "" : " [INACTIVE]"} (${t.id})\n` +
        `  intro words ${words(t.detailIntro)} | covers ${t.whatThisTestCovers.length} |` +
        ` why ${t.whyGetTested.length} | faqs ${t.faqs.length}\n` +
        `  seoTitle       [${len(t.seoTitle)}] ${t.seoTitle ?? "(null)"}\n` +
        `  seoDescription [${len(t.seoDescription)}] ${t.seoDescription ?? "(null)"}`,
    );
  }

  console.log("\n\n########## PHASE 3 — Ireland HOME page copy\n");
  const home = await prisma.pageContentTranslation.findMany({
    where: { pageContent: { country: { code: COUNTRY }, pageKey: "HOME" } },
    select: { id: true, locale: true, seoTitle: true, seoDescription: true },
    orderBy: { locale: "asc" },
  });
  for (const h of home) {
    console.log(`=== HOME ${h.locale} (${h.id})`);
    console.log(`  seoTitle       [${len(h.seoTitle)}] ${h.seoTitle ?? "(null)"}`);
    console.log(`  seoDescription [${len(h.seoDescription)}] ${h.seoDescription ?? "(null)"}`);
  }
  if (home.length === 0) console.log("(no HOME PageContentTranslation rows for ie)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
