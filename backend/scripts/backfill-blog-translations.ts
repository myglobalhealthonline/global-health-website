/**
 * One-off, idempotent backfill: for every existing BlogPost create a
 * BlogTranslation row (copying title/slug/excerpt/body→content/seoTitle/
 * seoDescription→seoDesc with the post's own locale) and, for posts that
 * already have a countryId, a BlogPostCountry row.
 *
 * Run once after applying the add_blog_translation_and_country migration:
 *
 *   npx tsx scripts/backfill-blog-translations.ts
 *
 * Idempotent: createMany({ skipDuplicates: true }) keyed on the unique
 * constraints — re-running never clobbers admin-edited translations.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main(): Promise<void> {
  const posts = await prisma.blogPost.findMany({
    select: {
      id: true,
      locale: true,
      title: true,
      slug: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      countryId: true,
    },
  });

  console.log(`Found ${posts.length} blog post(s).`);

  // --- BlogTranslation ---
  const translationData = posts.map((p) => ({
    postId: p.id,
    locale: p.locale as string,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? null,
    content: p.body ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDesc: p.seoDescription ?? null,
  }));

  const { count: trCreated } = await prisma.blogTranslation.createMany({
    data: translationData,
    skipDuplicates: true,
  });

  console.log(`BlogTranslation: created ${trCreated} / ${posts.length} rows (rest already existed).`);

  // --- BlogPostCountry ---
  const countryPosts = posts.filter((p) => p.countryId !== null);
  console.log(`Posts with countryId: ${countryPosts.length}`);

  if (countryPosts.length > 0) {
    const countryData = countryPosts.map((p) => ({
      postId: p.id,
      countryId: p.countryId as string,
    }));

    const { count: cpCreated } = await prisma.blogPostCountry.createMany({
      data: countryData,
      skipDuplicates: true,
    });

    console.log(`BlogPostCountry: created ${cpCreated} / ${countryPosts.length} rows (rest already existed).`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
