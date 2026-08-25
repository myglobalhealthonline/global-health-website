/**
 * Create the six Week 2 article sets as production CMS drafts.
 *
 * This script is dry-run by default. It never updates an existing BlogPost or
 * BlogTranslation. Any slug/title collision skips the complete topic so an
 * administrator's work cannot be overwritten.
 *
 * Usage from backend/:
 *   node --env-file=.env --import tsx scripts/seed-week2-blog-drafts-2026-08.ts
 *   node --env-file=.env --import tsx scripts/seed-week2-blog-drafts-2026-08.ts --apply
 */
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "./content/blog-seo-2026-08/types.js";
import { WEEK2_POST_SETS } from "./content/blog-week2-2026-08/index.js";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const SEEDED_BY = "seed-week2-blog-drafts-2026-08";
const RESEARCHED_AT = "2026-08-24";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ManifestRow = {
  topic: string;
  action: "create" | "created" | "skip-existing";
  postId: string | null;
  locale: string;
  slug: string;
  status: "DRAFT" | string;
  translationId: string | null;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function validate(set: PostSet, post: LocalePost): string[] {
  const body = renderArticle(post.article);
  const errors: string[] = [];
  const label = `${set.key}/${post.locale}`;
  if (!slugPattern.test(post.slug)) errors.push(`${label}: invalid ASCII slug ${post.slug}`);
  if (post.seoTitle.length > 60) errors.push(`${label}: SEO title exceeds 60 characters`);
  if (post.seoDescription.length > 155) errors.push(`${label}: SEO description exceeds 155 characters`);
  const words = wordCount(body);
  if (words < 900 || words > 2_600) errors.push(`${label}: ${words} words outside 900-2600`);
  if (post.article.faqs.length < 4 || post.article.faqs.length > 6) errors.push(`${label}: FAQ count outside 4-6`);
  if (!body.includes(`/services/${set.serviceSlug}`)) errors.push(`${label}: missing configured service link`);
  if (!body.includes("/doctors") || !body.includes("/contact")) errors.push(`${label}: missing doctors/contact links`);
  if (body.includes("/blog/categories/") || body.includes("/health/")) errors.push(`${label}: blocked internal route`);
  return errors;
}

async function findCollisions(set: PostSet) {
  const slugs = set.posts.map((post) => post.slug);
  const titles = set.posts.map((post) => post.title);
  const [posts, translations] = await Promise.all([
    prisma.blogPost.findMany({
      where: { OR: [{ slug: { in: slugs } }, { title: { in: titles } }] },
      select: { id: true, slug: true, locale: true, status: true, title: true, translations: { select: { id: true, locale: true, slug: true } } },
    }),
    prisma.blogTranslation.findMany({
      where: { OR: [{ slug: { in: slugs } }, { title: { in: titles } }] },
      select: { id: true, postId: true, slug: true, locale: true, title: true, post: { select: { status: true } } },
    }),
  ]);
  return { posts, translations };
}

async function verifyDoctor(doctorId: string, countryId: string, role: string, topic: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      fullName: true,
      active: true,
      countryId: true,
      additionalCountries: {
        where: { countryId },
        select: { active: true, chamberEntity: true, registrationNumber: true, isVerified: true },
      },
    },
  });
  const marketRegistration = doctor?.additionalCountries[0];
  const eligibleForMarket = doctor?.countryId === countryId || marketRegistration?.active;
  if (
    !doctor?.active || !eligibleForMarket || !marketRegistration?.active ||
    !marketRegistration.registrationNumber || !marketRegistration.chamberEntity ||
    !marketRegistration.isVerified
  ) {
    throw new Error(`${topic}: ${role} ${doctorId} lacks an active, verified market registration`);
  }
  return doctor;
}

async function main() {
  const sets = ONLY ? WEEK2_POST_SETS.filter((set) => set.key === ONLY) : WEEK2_POST_SETS;
  if (sets.length === 0) throw new Error(`--only=${ONLY} matched no Week 2 topic`);

  const errors = sets.flatMap((set) => set.posts.flatMap((post) => validate(set, post)));
  if (errors.length) throw new Error(`REFUSING TO RUN\n${errors.map((error) => `- ${error}`).join("\n")}`);

  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: ${sets.length} Week 2 topic(s), ${sets.flatMap((set) => set.posts).length} locale draft(s)`);
  const manifest: ManifestRow[] = [];

  for (const set of sets) {
    const primary = set.posts[0];
    if (!primary) throw new Error(`${set.key}: primary locale is missing`);
    const country = await prisma.country.findFirst({ where: { code: set.countryCode }, select: { id: true, name: true } });
    if (!country) throw new Error(`${set.key}: country ${set.countryCode} was not found`);
    const service = await prisma.service.findFirst({
      where: { countryId: country.id, slug: set.serviceSlug },
      select: { id: true, slug: true, name: true, isActive: true },
    });
    if (!service?.isActive) throw new Error(`${set.key}: active service ${set.serviceSlug} was not found`);
    await verifyDoctor(set.authorDoctorId, country.id, "author", set.key);
    if (!set.reviewerDoctorId) throw new Error(`${set.key}: reviewerDoctorId is required`);
    await verifyDoctor(set.reviewerDoctorId, country.id, "reviewer", set.key);

    const collision = await findCollisions(set);
    if (collision.posts.length || collision.translations.length) {
      console.log(`${set.key}: SKIP existing CMS content; no rows changed`);
      for (const post of set.posts) {
        const base = collision.posts.find((row) => row.slug === post.slug || row.title === post.title);
        const translation = collision.translations.find((row) => row.slug === post.slug || row.title === post.title)
          ?? collision.posts.flatMap((row) => row.translations.map((item) => ({ ...item, postId: row.id, post: { status: row.status } }))).find((row) => row.slug === post.slug);
        manifest.push({
          topic: set.key,
          action: "skip-existing",
          postId: base?.id ?? translation?.postId ?? null,
          locale: post.locale,
          slug: post.slug,
          status: base?.status ?? translation?.post.status ?? "EXISTING",
          translationId: translation?.id ?? null,
        });
      }
      continue;
    }

    console.log(`${set.key}: ${country.name}; CTA ${service.slug}; ${set.posts.length} locale(s)`);
    if (!APPLY) {
      manifest.push(...set.posts.map((post, index) => ({
        topic: set.key,
        action: "create" as const,
        postId: null,
        locale: post.locale,
        slug: post.slug,
        status: "DRAFT" as const,
        translationId: index === 0 ? null : null,
      })));
      continue;
    }

    const created = await prisma.$transaction(async (tx) => {
      const inside = await Promise.all([
        tx.blogPost.count({ where: { OR: [{ slug: { in: set.posts.map((post) => post.slug) } }, { title: { in: set.posts.map((post) => post.title) } }] } }),
        tx.blogTranslation.count({ where: { OR: [{ slug: { in: set.posts.map((post) => post.slug) } }, { title: { in: set.posts.map((post) => post.title) } }] } }),
      ]);
      if (inside[0] || inside[1]) throw new Error(`${set.key}: collision appeared during transaction`);
      const primaryBody = renderArticle(primary.article);
      return tx.blogPost.create({
        data: {
          countryId: country.id,
          slug: primary.slug,
          title: primary.title,
          excerpt: primary.excerpt,
          body: primaryBody,
          status: "DRAFT",
          locale: primary.locale,
          category: primary.category,
          authorDisplayName: set.authorDisplayName,
          reviewerDisplayName: set.reviewerDisplayName ?? null,
          authorDoctorId: set.authorDoctorId,
          reviewerDoctorId: set.reviewerDoctorId,
          ctaServiceId: service.id,
          seoTitle: primary.seoTitle,
          seoDescription: primary.seoDescription,
          publishedAt: null,
          lastReviewedAt: null,
          isActive: true,
          editorialChecklist: {
            readyToIndex: false,
            clinicalReview: "required",
            nativeEditorReview: "required",
            aiAssisted: true,
            researchedAt: RESEARCHED_AT,
            seededBy: SEEDED_BY,
            seedHash: hash(primaryBody),
            targetKeyword: set.targetKeyword,
            searchVolume: set.searchVolume,
            keywordDifficulty: set.keywordDifficulty,
            evidence: set.evidence,
          },
          countries: { create: { countryId: country.id } },
          translations: {
            create: set.posts.slice(1).map((post) => ({
              locale: post.locale,
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              content: renderArticle(post.article),
              seoTitle: post.seoTitle,
              seoDesc: post.seoDescription,
            })),
          },
        },
        select: { id: true, status: true, slug: true, locale: true, translations: { select: { id: true, locale: true, slug: true } } },
      });
    });

    manifest.push({ topic: set.key, action: "created", postId: created.id, locale: created.locale, slug: created.slug, status: created.status, translationId: null });
    manifest.push(...created.translations.map((translation) => ({
      topic: set.key,
      action: "created" as const,
      postId: created.id,
      locale: translation.locale,
      slug: translation.slug,
      status: created.status,
      translationId: translation.id,
    })));
  }

  console.log("\nMANIFEST");
  console.table(manifest);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
