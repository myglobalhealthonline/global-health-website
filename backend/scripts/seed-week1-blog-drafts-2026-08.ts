/**
 * Save the 5 core Week 1 editorial-plan posts as admin blog drafts.
 *
 * - Reuses the already-authored PT/IE/CZ source-language articles.
 * - Adds new ES/RO blood-pressure posts.
 * - Seeds only the primary locale for each topic right now.
 * - Writes DRAFT rows only; no publication dates are set.
 *
 * Usage from backend/:
 *   node --env-file=.env --import tsx scripts/seed-week1-blog-drafts-2026-08.ts
 *   node --env-file=.env --import tsx scripts/seed-week1-blog-drafts-2026-08.ts --apply
 *   node --env-file=.env --import tsx scripts/seed-week1-blog-drafts-2026-08.ts --only=es-tension-arterial-normal --apply
 */
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import { WEEK1_POST_SETS } from "./content/blog-week1-2026-08/index.js";
import type { LocalePost, PostSet } from "./content/blog-seo-2026-08/types.js";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const SEEDED_BY = "seed-week1-blog-drafts-2026-08";

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 155;
const WORDS_MIN = 1500;
const WORDS_MAX = 2500;
const FAQ_MIN = 4;
const FAQ_MAX = 6;
const BLOCKED = [
  /\bTODO\b/, /\bplaceholder\b/i, /\bmigration\b/i, /\badapter\b/i,
  /\btemplate-driven\b/i, /\badmin-managed\b/i, /\bfuture-managed\b/i,
  /\bseeded\b/i, /\bfallback\b/i, /\bmock\b/i, /\bpending\b/i,
  /\blegacy compatibility\b/i,
];

const bodyHash = (body: string) => createHash("sha256").update(body).digest("hex");
const plain = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function validate(set: PostSet, post: LocalePost, body: string): string[] {
  const errors: string[] = [];
  const words = wordCount(body);
  const id = `${set.key}/${post.locale}`;

  if (post.seoTitle.length > SEO_TITLE_MAX) {
    errors.push(`${id}: seoTitle ${post.seoTitle.length} > ${SEO_TITLE_MAX}`);
  }
  if (post.seoDescription.length > SEO_DESC_MAX) {
    errors.push(`${id}: seoDescription ${post.seoDescription.length} > ${SEO_DESC_MAX}`);
  }
  if (words < WORDS_MIN || words > WORDS_MAX) {
    errors.push(`${id}: ${words} words outside ${WORDS_MIN}-${WORDS_MAX}`);
  }
  if (post.article.faqs.length < FAQ_MIN || post.article.faqs.length > FAQ_MAX) {
    errors.push(`${id}: ${post.article.faqs.length} FAQs outside ${FAQ_MIN}-${FAQ_MAX}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
    errors.push(`${id}: slug "${post.slug}" is not lowercase-hyphen ASCII`);
  }
  if ((body.match(/<details class="faq-item">/g) ?? []).length !== post.article.faqs.length) {
    errors.push(`${id}: FAQ markup count mismatch`);
  }

  const text = plain(body);
  for (const pattern of BLOCKED) {
    if (
      pattern.test(text) || pattern.test(post.title) || pattern.test(post.excerpt) ||
      pattern.test(post.seoTitle) || pattern.test(post.seoDescription)
    ) {
      errors.push(`${id}: copy trips publication-validation blocked pattern ${pattern}`);
    }
  }

  const requiredLinks = [
    `/services/${set.serviceSlug}`,
    "/doctors",
    "/contact",
  ];
  for (const link of requiredLinks) {
    if (!body.includes(link)) errors.push(`${id}: missing required internal link ${link}`);
  }

  if (!text) errors.push(`${id}: body rendered empty`);
  if (body.includes("/blog/categories/")) errors.push(`${id}: links to /blog/categories/, which is a live 404`);

  return errors;
}

async function main() {
  const sets = ONLY
    ? WEEK1_POST_SETS.filter((set) => set.key === ONLY || set.countryCode === ONLY)
    : WEEK1_POST_SETS;
  if (sets.length === 0) throw new Error(`--only=${ONLY} matched no Week 1 post set`);

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${sets.length} Week 1 article(s)\n`);

  const errors: string[] = [];

  for (const set of sets) {
    const primary = set.posts[0];
    if (!primary) {
      errors.push(`${set.key}: no primary locale post found`);
      continue;
    }
    const body = renderArticle(primary.article);
    errors.push(...validate(set, primary, body));
  }

  if (errors.length > 0) {
    console.error(`REFUSING TO RUN — ${errors.length} problem(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  for (const set of sets) {
    const primary = set.posts[0]!;
    const body = renderArticle(primary.article);
    const hash = bodyHash(body);

    const country = await prisma.country.findFirst({
      where: { code: set.countryCode },
      select: { id: true, name: true },
    });
    if (!country) throw new Error(`${set.key}: country ${set.countryCode} not found`);

    const service = await prisma.service.findFirst({
      where: { countryId: country.id, slug: set.serviceSlug },
      select: { id: true, slug: true, isActive: true, name: true },
    });
    if (!service) throw new Error(`${set.key}: service ${set.serviceSlug} not found`);
    if (!service.isActive) throw new Error(`${set.key}: service ${set.serviceSlug} is inactive`);

    const existing = await prisma.blogPost.findFirst({
      where: { slug: primary.slug, locale: primary.locale, countryId: null },
      select: {
        id: true,
        body: true,
        status: true,
        publishedAt: true,
        lastReviewedAt: true,
        editorialChecklist: true,
      },
    });

    const translationCollision = await prisma.blogTranslation.findFirst({
      where: { slug: primary.slug },
      select: { postId: true },
    });
    if (translationCollision && translationCollision.postId !== existing?.id) {
      throw new Error(
        `${set.key}: slug ${primary.slug} already belongs to a translation on another post`,
      );
    }

    const checklist = (existing?.editorialChecklist ?? null) as
      | { seedHash?: string; seededBy?: string }
      | null;
    const bodyChangedFromSeed =
      Boolean(existing && checklist?.seedHash && checklist.seedHash !== bodyHash(existing.body));
    const skipBecauseReviewed =
      Boolean(existing && (existing.status === "PUBLISHED" || existing.publishedAt || existing.lastReviewedAt));
    const skipBecauseUnowned = Boolean(existing && checklist?.seededBy !== SEEDED_BY);
    const skipBecauseEdited =
      Boolean(existing && checklist?.seededBy === SEEDED_BY && bodyChangedFromSeed);

    console.log(
      `${set.key}\n` +
        `  ${primary.locale} ${primary.slug}\n` +
        `  service: ${service.slug} (${service.name})\n` +
        `  search: ${set.targetKeyword} · vol ${set.searchVolume ?? "n/a"} · KD ${set.keywordDifficulty ?? "n/a"}`,
    );

    if (skipBecauseReviewed) {
      console.log("  skip: existing row is already published/reviewed");
      continue;
    }
    if (skipBecauseUnowned) {
      console.log("  skip: existing draft was not created by this seeder");
      continue;
    }
    if (skipBecauseEdited) {
      console.log("  skip: existing draft body was edited after seeding");
      continue;
    }

    if (!APPLY) {
      console.log(
        `  body words: ${wordCount(body)} · ` +
          `${existing ? `would update existing ${existing.status} draft ${existing.id}` : "would create draft"}`,
      );
      continue;
    }

    const editorialChecklist = {
      readyToIndex: false,
      clinicalReview: "required",
      seededBy: SEEDED_BY,
      seedHash: hash,
      targetKeyword: set.targetKeyword,
      searchVolume: set.searchVolume,
      keywordDifficulty: set.keywordDifficulty,
      evidence: set.evidence,
    };

    if (existing) {
      await prisma.blogPost.update({
        where: { id: existing.id },
        data: {
          title: primary.title,
          excerpt: primary.excerpt,
          body,
          category: primary.category,
          authorDisplayName: set.authorDisplayName,
          reviewerDisplayName: set.reviewerDisplayName ?? null,
          authorDoctorId: set.authorDoctorId,
          reviewerDoctorId: set.reviewerDoctorId ?? null,
          ctaServiceId: service.id,
          seoTitle: primary.seoTitle,
          seoDescription: primary.seoDescription,
          status: "DRAFT",
          locale: primary.locale,
          editorialChecklist,
          isActive: true,
          publishedAt: null,
          lastReviewedAt: null,
        },
      });
      await prisma.blogPostCountry.upsert({
        where: { postId_countryId: { postId: existing.id, countryId: country.id } },
        create: { postId: existing.id, countryId: country.id },
        update: {},
      });
      console.log("  updated draft");
    } else {
      await prisma.blogPost.create({
        data: {
          slug: primary.slug,
          title: primary.title,
          excerpt: primary.excerpt,
          body,
          status: "DRAFT",
          locale: primary.locale,
          category: primary.category,
          authorDisplayName: set.authorDisplayName,
          reviewerDisplayName: set.reviewerDisplayName ?? null,
          authorDoctorId: set.authorDoctorId,
          reviewerDoctorId: set.reviewerDoctorId ?? null,
          ctaServiceId: service.id,
          seoTitle: primary.seoTitle,
          seoDescription: primary.seoDescription,
          editorialChecklist,
          isActive: true,
          countries: { create: { countryId: country.id } },
        },
      });
      console.log("  created draft");
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
