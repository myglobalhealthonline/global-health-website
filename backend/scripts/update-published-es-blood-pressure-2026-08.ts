/**
 * Apply the owner-approved patient-value correction to one published Spanish post.
 * Dry-run is the default. The script refuses any production state other than the
 * exact record version inspected immediately before implementation.
 *
 * From backend/:
 *   node --env-file=.env --import tsx scripts/update-published-es-blood-pressure-2026-08.ts
 *   node --env-file=.env --import tsx scripts/update-published-es-blood-pressure-2026-08.ts --apply
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { ES_TENSION_ARTERIAL_NORMAL } from "./content/blog-week1-2026-08/es-tension-arterial-normal.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";

const APPLY = process.argv.includes("--apply");
const RECORD_ID = "cmt5txqqn0000s8ju2rz5zg1u";
const EXPECTED_SLUG = "tension-arterial-normal-tabla-edad-sexo";
const EXPECTED_CURRENT_HASH = "d4ccf7681b6abbc8ecf1912ac97bc1e5f5c687d1e49a627a6216db4e7adde23f";
const EXPECTED_PUBLISHED_AT = "2026-08-25T11:47:56.319Z";
const EXPECTED_REVIEWED_AT = "2026-08-25T11:56:37.477Z";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const iso = (value: Date | null) => value?.toISOString() ?? null;

async function main() {
  const post = ES_TENSION_ARTERIAL_NORMAL.posts[0];
  if (!post || post.locale !== "ES" || post.slug !== EXPECTED_SLUG) {
    throw new Error("Local Spanish source identity mismatch");
  }

  const existing = await prisma.blogPost.findUnique({
    where: { id: RECORD_ID },
    select: {
      id: true,
      slug: true,
      locale: true,
      status: true,
      publishedAt: true,
      lastReviewedAt: true,
      body: true,
      editorialChecklist: true,
      translations: { select: { id: true }, orderBy: { id: "asc" } },
    },
  });
  if (!existing) throw new Error("Approved Spanish record not found");
  if (existing.slug !== EXPECTED_SLUG || existing.locale !== "ES") {
    throw new Error("Production record identity mismatch");
  }
  if (existing.status !== "PUBLISHED") {
    throw new Error("Production record is no longer published; refusing update");
  }
  if (
    iso(existing.publishedAt) !== EXPECTED_PUBLISHED_AT ||
    iso(existing.lastReviewedAt) !== EXPECTED_REVIEWED_AT
  ) {
    throw new Error("Publication or review state changed; refusing update");
  }
  if (existing.translations.length !== 5) {
    throw new Error("Translation set changed; refusing update");
  }
  const currentHash = hash(existing.body);
  if (currentHash !== EXPECTED_CURRENT_HASH) {
    throw new Error("Published body changed after inspection; refusing overwrite");
  }

  const body = renderArticle(post.article);
  const nextHash = hash(body);
  const translationIds = existing.translations.map(({ id }) => id);
  const currentChecklist = (existing.editorialChecklist ?? {}) as Prisma.InputJsonObject;
  const editorialChecklist: Prisma.InputJsonObject = {
    ...currentChecklist,
    seedHash: nextHash,
    patientValueCorrection: "owner-approved-2026-08-25",
  };

  console.table([{
    id: RECORD_ID,
    slug: post.slug,
    status: existing.status,
    words: wordCount(body),
    translations: translationIds.length,
    currentHash,
    nextHash,
    mode: APPLY ? "APPLY" : "DRY RUN",
  }]);
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    const locked = await tx.blogPost.findUnique({
      where: { id: RECORD_ID },
      select: {
        body: true,
        status: true,
        publishedAt: true,
        lastReviewedAt: true,
        translations: { select: { id: true }, orderBy: { id: "asc" } },
      },
    });
    if (
      !locked ||
      locked.status !== "PUBLISHED" ||
      iso(locked.publishedAt) !== EXPECTED_PUBLISHED_AT ||
      iso(locked.lastReviewedAt) !== EXPECTED_REVIEWED_AT ||
      hash(locked.body) !== currentHash ||
      JSON.stringify(locked.translations.map(({ id }) => id)) !== JSON.stringify(translationIds)
    ) {
      throw new Error("Production record changed after preparation");
    }

    await tx.blogPost.update({
      where: { id: RECORD_ID },
      data: {
        title: post.title,
        excerpt: post.excerpt,
        body,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        editorialChecklist,
        status: "PUBLISHED",
        publishedAt: existing.publishedAt,
        lastReviewedAt: existing.lastReviewedAt,
      },
    });
  });

  const saved = await prisma.blogPost.findUnique({
    where: { id: RECORD_ID },
    select: {
      status: true,
      publishedAt: true,
      lastReviewedAt: true,
      body: true,
      translations: { select: { id: true }, orderBy: { id: "asc" } },
    },
  });
  if (
    !saved ||
    saved.status !== "PUBLISHED" ||
    iso(saved.publishedAt) !== EXPECTED_PUBLISHED_AT ||
    iso(saved.lastReviewedAt) !== EXPECTED_REVIEWED_AT ||
    hash(saved.body) !== nextHash ||
    JSON.stringify(saved.translations.map(({ id }) => id)) !== JSON.stringify(translationIds)
  ) {
    throw new Error("Post-write verification failed");
  }
  console.log("VERIFIED: published Spanish article corrected; state and translations preserved");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
