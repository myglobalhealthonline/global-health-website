/**
 * Content audit follow-up (July 2026): two live blog posts have literal,
 * hand-typed stale text baked into their stored `BlogPost.body` HTML
 * (rendered via dangerouslySetInnerHTML in
 * frontend/lib/content/blog-post-page.tsx — the body itself is admin-authored
 * HTML, not computed by any component). Both posts already carry a live,
 * correct "Last reviewed {date}" chip elsewhere on the page (sourced from
 * post.lastReviewedAt, same field as the JSON-LD Article.dateModified), so
 * removing the stale hardcoded text below does not remove the site's only
 * freshness signal — it removes a second, wrong/stale one.
 *
 *   1. diabetes-a-silent-disease (EN)
 *      - Hero eyebrow has a hardcoded "· Updated June 2026" suffix.
 *        lastReviewedAt is actually 2026-07-21, so the baked-in date is wrong.
 *      - A "10-minute read" hero-fact pill with no live counterpart — the
 *        real, live-computed reading time (~34 min) is rendered separately
 *        in the React hero via post.readingTime. 10-minute is simply wrong,
 *        so the pill is removed outright rather than replaced.
 *   2. hand-foot-and-mouth-disease-signs-and-treatment (EN)
 *      - Hero label has the same hardcoded "· Updated June 2026" suffix.
 *        lastReviewedAt is 2026-06-15, so June happens to be correct today,
 *        but it's still a hardcoded string that will go stale the next time
 *        the post is revised — removed for the same reason as #1.
 *
 * Each fix is a targeted string replacement against the known BEFORE HTML
 * (not a full body rewrite), applied only if the exact substring is still
 * present — safe to re-run after --apply (idempotent: finds nothing left).
 *
 *   node --env-file=.env --import tsx scripts/patch-blog-stale-hero-text.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-blog-stale-hero-text.ts --apply    # write
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type Fix = {
  slug: string;
  postId: string;
  label: string;
  before: string;
  after: string;
};

async function main() {
  const fixes: Fix[] = [];

  const diabetes = await prisma.blogPost.findFirst({
    where: { slug: "diabetes-a-silent-disease", locale: "EN" },
    select: { id: true, body: true },
  });
  if (!diabetes) throw new Error("BlogPost diabetes-a-silent-disease (EN) not found");

  const D1_BEFORE = '<span class="eyebrow">Ireland · Clinical guide · Updated June 2026</span>';
  const D1_AFTER = '<span class="eyebrow">Ireland · Clinical guide</span>';
  if (diabetes.body.includes(D1_BEFORE)) {
    fixes.push({
      slug: "diabetes-a-silent-disease",
      postId: diabetes.id,
      label: "hero eyebrow — drop hardcoded 'Updated June 2026'",
      before: D1_BEFORE,
      after: D1_AFTER,
    });
  } else {
    console.log(`SKIP: diabetes-a-silent-disease eyebrow BEFORE string not found — no change.`);
  }

  const D2_BEFORE = '<span class="hero-fact">10-minute read</span>';
  const D2_AFTER = "";
  if (diabetes.body.includes(D2_BEFORE)) {
    fixes.push({
      slug: "diabetes-a-silent-disease",
      postId: diabetes.id,
      label: "hero-facts — remove stray wrong '10-minute read' pill (live ~34min value shown elsewhere on page)",
      before: D2_BEFORE,
      after: D2_AFTER,
    });
  } else {
    console.log(`SKIP: diabetes-a-silent-disease '10-minute read' pill BEFORE string not found — no change.`);
  }

  const hfm = await prisma.blogPost.findFirst({
    where: { slug: "hand-foot-and-mouth-disease-signs-and-treatment", locale: "EN" },
    select: { id: true, body: true },
  });
  if (!hfm) throw new Error("BlogPost hand-foot-and-mouth-disease-signs-and-treatment (EN) not found");

  const H1_BEFORE = '<p class="hero-label">Evidence-Based Guide · ICD-10: B08.4 · Updated June 2026</p>';
  const H1_AFTER = '<p class="hero-label">Evidence-Based Guide · ICD-10: B08.4</p>';
  if (hfm.body.includes(H1_BEFORE)) {
    fixes.push({
      slug: "hand-foot-and-mouth-disease-signs-and-treatment",
      postId: hfm.id,
      label: "hero label — drop hardcoded 'Updated June 2026' (coincidentally correct this month, will go stale again)",
      before: H1_BEFORE,
      after: H1_AFTER,
    });
  } else {
    console.log(`SKIP: hand-foot-and-mouth-disease-signs-and-treatment hero-label BEFORE string not found — no change.`);
  }

  const bodies: Record<string, string> = {
    [diabetes.id]: diabetes.body,
    [hfm.id]: hfm.body,
  };

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${fixes.length} change(s) found:\n`);
  for (const f of fixes) {
    console.log(`post:   ${f.slug} (${f.postId})`);
    console.log(`change: ${f.label}`);
    console.log(`BEFORE: ${JSON.stringify(f.before)}`);
    console.log(`AFTER:  ${JSON.stringify(f.after)}`);
    const occurrences = bodies[f.postId].split(f.before).length - 1;
    console.log(`occurrences in body: ${occurrences}`);
    console.log("");
    // Accumulate into the working body so a second fix on the same post
    // (diabetes has two) is computed against the post-first-fix string.
    bodies[f.postId] = bodies[f.postId].replaceAll(f.before, f.after);
  }

  if (!APPLY) {
    console.log("Dry run only — pass --apply to write.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const postId of Object.keys(bodies)) {
      await tx.blogPost.update({ where: { id: postId }, data: { body: bodies[postId] } });
    }
  });
  console.log(`Applied — updated ${Object.keys(bodies).length} post(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
