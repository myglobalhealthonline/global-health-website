/**
 * Read-only: resolve the legacy `/post/<slug>` links used inside published blog
 * bodies against the BlogPost table, so broken ones can be repointed rather
 * than guessed at.
 *
 * Two links in "sick-certificate-ireland-employee-rights" 308 to the blog hub
 * instead of an article, which means the reader lands on a listing page. This
 * prints, for every /post/ href found in any published body, whether a BlogPost
 * with that slug exists and what its live country/locale path would be.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-blog-legacy-links.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", isActive: true },
    select: {
      id: true,
      slug: true,
      locale: true,
      title: true,
      body: true,
      country: { select: { code: true, slug: true } },
    },
  });

  console.log(`${posts.length} published post(s).\n`);

  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const referenced = new Map<string, Set<string>>();

  for (const p of posts) {
    for (const m of p.body.matchAll(/href="[^"]*\/post\/([^"?#]+)/g)) {
      const target = decodeURIComponent(m[1]).replace(/\/$/, "");
      if (!referenced.has(target)) referenced.set(target, new Set());
      referenced.get(target)!.add(p.slug);
    }
  }

  if (referenced.size === 0) {
    console.log("No /post/ links found in any published body.");
    return;
  }

  for (const [target, sources] of [...referenced].sort()) {
    const hit = bySlug.get(target);
    if (hit) {
      const country = hit.country?.slug ?? "(no country)";
      const lang = hit.locale.toLowerCase();
      console.log(`OK      /post/${target}`);
      console.log(`        -> /${country}/${lang}/blog/${hit.slug}`);
    } else {
      console.log(`BROKEN  /post/${target}   (no published BlogPost with this slug)`);
    }
    console.log(`        linked from: ${[...sources].join(", ")}`);
  }

  console.log("\nPublished slugs, for picking replacements:");
  for (const p of posts) {
    console.log(`  ${p.locale}  ${p.country?.slug ?? "-"}  ${p.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
