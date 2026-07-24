/**
 * SEO fix (2026-07-24 re-audit): the diabetes blog post body carries legacy
 * Wix-era anchors to /blog/categories/cardiology and
 * /blog/categories/endocrinology — both live 404s (no category routes exist
 * in this app). Internal links to 404s from a YMYL article body.
 *
 * Rewrites each such href to the Ireland blog index (the only market this
 * EN-only post renders under) across ALL BlogPost.body and
 * BlogTranslation.content rows that contain the pattern — keeps the
 * "Browse all X articles" related-card UX working instead of leaving dead
 * unclickable cards. No text or markup removed, href only.
 *
 *   node --env-file=.env --import tsx scripts/patch-blog-dead-category-links.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-blog-dead-category-links.ts --apply    # write
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const NEEDLE = "/blog/categories/";
const HREF_RE = /href="[^"]*\/blog\/categories\/[^"]*"/gi;
const REPLACEMENT = 'href="https://www.myglobalhealth.online/ireland/en/blog"';

function strip(html: string): string {
  return html.replace(HREF_RE, REPLACEMENT);
}

function preview(label: string, html: string) {
  let m: RegExpExecArray | null;
  const re = new RegExp(HREF_RE.source, "gi");
  while ((m = re.exec(html)) !== null) {
    console.log(`  ${label}: ${m[0]} -> ${REPLACEMENT}`);
  }
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    where: { body: { contains: NEEDLE } },
    select: { id: true, slug: true, locale: true, body: true },
  });
  const translations = await prisma.blogTranslation.findMany({
    where: { content: { contains: NEEDLE } },
    select: { id: true, slug: true, locale: true, content: true },
  });

  console.log(`Posts with dead category links: ${posts.length}`);
  for (const p of posts) {
    console.log(`- BlogPost ${p.slug} (${p.locale}, id ${p.id})`);
    preview("anchor", p.body);
  }
  console.log(`Translations with dead category links: ${translations.length}`);
  for (const t of translations) {
    console.log(`- BlogTranslation ${t.slug} (${t.locale}, id ${t.id})`);
    preview("anchor", t.content ?? "");
  }

  if (!APPLY) {
    console.log("\nDry run only — pass --apply to write.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of posts) {
      // Guard: only write if the body is unchanged since the read above.
      const r = await tx.blogPost.updateMany({
        where: { id: p.id, body: p.body },
        data: { body: strip(p.body) },
      });
      if (r.count === 0) throw new Error(`Aborting: BlogPost ${p.id} changed since read.`);
    }
    for (const t of translations) {
      const r = await tx.blogTranslation.updateMany({
        where: { id: t.id, content: t.content },
        data: { content: strip(t.content ?? "") },
      });
      if (r.count === 0) throw new Error(`Aborting: BlogTranslation ${t.id} changed since read.`);
    }
  });
  console.log(`\nApplied: ${posts.length} post(s), ${translations.length} translation(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
