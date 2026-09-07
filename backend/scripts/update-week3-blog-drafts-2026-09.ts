/**
 * Re-sync the six Week 3 DRAFT rows with the TypeScript content module.
 *
 * Guarded: a row is only rewritten when its current body still hashes to the
 * `editorialChecklist.seedHash` it was seeded with, so an editor's CMS changes
 * are never overwritten. Rows that were edited are reported and skipped.
 * DRAFT only — a published row is never touched.
 *
 * Usage from backend/:
 *   node --env-file=.env --import tsx scripts/update-week3-blog-drafts-2026-09.ts
 *   node --env-file=.env --import tsx scripts/update-week3-blog-drafts-2026-09.ts --apply
 */
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { renderArticle } from "./content/blog-seo-2026-08/template.js";
import { WEEK3_POST_SETS } from "./content/blog-week3-2026-09/index.js";

const APPLY = process.argv.includes("--apply");
const SEEDED_BY = "seed-week3-blog-drafts-2026-09";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function main() {
  const rows = await prisma.blogPost.findMany({
    where: { editorialChecklist: { path: ["seededBy"], equals: SEEDED_BY } },
    select: { id: true, slug: true, status: true, title: true, excerpt: true, body: true, editorialChecklist: true },
  });
  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: ${rows.length} Week 3 row(s) found`);
  const manifest: { slug: string; action: string; postId: string }[] = [];

  for (const set of WEEK3_POST_SETS) {
    const post = set.posts[0];
    const row = rows.find((r) => r.slug === post.slug);
    if (!row) { manifest.push({ slug: post.slug, action: "missing", postId: "-" }); continue; }
    if (row.status !== "DRAFT") { manifest.push({ slug: post.slug, action: `skip-${row.status}`, postId: row.id }); continue; }
    const checklist = (row.editorialChecklist ?? {}) as Record<string, unknown>;
    if (hash(row.body) !== checklist.seedHash) { manifest.push({ slug: post.slug, action: "skip-edited-in-cms", postId: row.id }); continue; }
    const body = renderArticle(post.article);
    if (row.body === body && row.title === post.title && row.excerpt === post.excerpt) {
      manifest.push({ slug: post.slug, action: "unchanged", postId: row.id });
      continue;
    }
    if (APPLY) {
      await prisma.blogPost.update({
        where: { id: row.id },
        data: {
          title: post.title,
          excerpt: post.excerpt,
          body,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          editorialChecklist: { ...checklist, seedHash: hash(body), resyncedAt: new Date().toISOString() },
        },
      });
    }
    manifest.push({ slug: post.slug, action: APPLY ? "updated" : "would-update", postId: row.id });
  }
  console.table(manifest);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
