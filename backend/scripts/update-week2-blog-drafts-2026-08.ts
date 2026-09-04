/* eslint-disable no-console */
/**
 * Update the six existing Week 2 production records without changing draft state.
 * Dry-run is the default. Published, reviewed, translated, unowned or manually
 * edited records are refused, and all six are verified before any mutation.
 *
 * From backend/:
 *   node --env-file=.env --import tsx scripts/update-week2-blog-drafts-2026-08.ts
 *   node --env-file=.env --import tsx scripts/update-week2-blog-drafts-2026-08.ts --only=pt-baixa-medica-valor
 *   node --env-file=.env --import tsx scripts/update-week2-blog-drafts-2026-08.ts --apply
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import { WEEK2_PRIMARY_POST_SETS } from "./content/blog-week2-2026-08/index.js";

const APPLY = process.argv.includes("--apply");
export function parseOnly(args: readonly string[]): string | undefined {
  if (args.includes("--only")) throw new Error("Use --only=<key>");
  const unknown = args.find((arg) => arg !== "--apply" && !arg.startsWith("--only="));
  if (unknown) throw new Error(`Unknown argument: ${unknown}`);
  const options = args.filter((arg) => arg.startsWith("--only="));
  if (options.length === 0) return undefined;
  if (options.length > 1) throw new Error("Pass --only=<key> at most once");
  const option = options[0];
  if (!option) throw new Error("Use --only=<key>");
  const value = option.slice("--only=".length);
  if (!value) throw new Error("--only requires a non-empty key");
  return value;
}

const ONLY = parseOnly(process.argv.slice(2));
const SEEDED_BY = "seed-week2-blog-drafts-2026-08";
const expectedIds = new Map([
  ["pt-baixa-medica-valor", "cmt8la5mj0000csjuzvvr49bg"],
  ["ie-illness-benefit-payment", "cmt8la96q0002csju6spj0o0n"],
  ["cz-vypocet-nemocenske", "cmt8ladb60004csjuxgxyk4nu"],
  ["pt-atestado-carta-conducao", "cmt8lahc30006csjuw55xnemg"],
  ["es-tension-alta-urgencias", "cmt8laldn0008csjufi90oq5x"],
  ["ro-scade-tensiunea-rapid", "cmt8lapi9000acsju2l7jkq5m"],
]);

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

type Prepared = {
  id: string;
  key: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  currentHash: string;
  nextHash: string;
  checklist: Prisma.InputJsonObject;
};

async function prepare(): Promise<Prepared[]> {
  if (WEEK2_PRIMARY_POST_SETS.length !== 6 || expectedIds.size !== 6) {
    throw new Error("Expected exactly six Week 2 primary drafts");
  }
  const sets = ONLY
    ? WEEK2_PRIMARY_POST_SETS.filter((set) => set.key === ONLY)
    : WEEK2_PRIMARY_POST_SETS;
  if (sets.length === 0) throw new Error(`--only=${ONLY} matched no Week 2 post set`);
  const prepared: Prepared[] = [];
  for (const set of sets) {
    const post = set.posts[0];
    const id = expectedIds.get(set.key);
    if (!post || !id) throw new Error(`${set.key}: missing primary post or approved record id`);
    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true, slug: true, locale: true, status: true, publishedAt: true,
        lastReviewedAt: true, body: true, editorialChecklist: true,
        translations: { select: { id: true } },
      },
    });
    if (!existing) throw new Error(`${set.key}: approved record ${id} not found`);
    if (existing.slug !== post.slug || existing.locale !== post.locale) {
      throw new Error(`${set.key}: record identity mismatch`);
    }
    if (existing.status !== "DRAFT" || existing.publishedAt || existing.lastReviewedAt) {
      throw new Error(`${set.key}: record is published or reviewed; refusing update`);
    }
    if (existing.translations.length !== 0) {
      throw new Error(`${set.key}: translations exist; refusing primary-only update`);
    }
    const currentChecklist = (existing.editorialChecklist ?? {}) as Record<string, unknown>;
    if (currentChecklist.seededBy !== SEEDED_BY) {
      throw new Error(`${set.key}: record is not owned by ${SEEDED_BY}`);
    }
    const currentHash = hash(existing.body);
    if (currentChecklist.seedHash !== currentHash) {
      throw new Error(`${set.key}: body changed after seeding; refusing overwrite`);
    }
    const body = renderArticle(post.article);
    const nextHash = hash(body);
    prepared.push({
      id, key: set.key, slug: post.slug, locale: post.locale, title: post.title,
      excerpt: post.excerpt, body, seoTitle: post.seoTitle,
      seoDescription: post.seoDescription, currentHash, nextHash,
      checklist: {
        ...(currentChecklist as Prisma.InputJsonObject),
        readyToIndex: false,
        clinicalReview: "required",
        nativeEditorReview: "required",
        seedHash: nextHash,
      },
    });
  }
  return prepared;
}

async function main() {
  const prepared = await prepare();
  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: update ${prepared.length} existing Week 2 DRAFT record(s)`);
  console.table(prepared.map((row) => ({
    id: row.id, key: row.key, locale: row.locale, slug: row.slug,
    words: wordCount(row.body), currentHash: row.currentHash,
    nextHash: row.nextHash, status: "DRAFT",
  })));
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    for (const row of prepared) {
      const current = await tx.blogPost.findUnique({
        where: { id: row.id },
        select: { body: true, status: true, publishedAt: true, lastReviewedAt: true },
      });
      if (!current || current.status !== "DRAFT" || current.publishedAt || current.lastReviewedAt || hash(current.body) !== row.currentHash) {
        throw new Error(`${row.key}: record changed after preparation`);
      }
      await tx.blogPost.update({
        where: { id: row.id },
        data: {
          title: row.title, excerpt: row.excerpt, body: row.body,
          seoTitle: row.seoTitle, seoDescription: row.seoDescription,
          editorialChecklist: row.checklist, status: "DRAFT",
          publishedAt: null, lastReviewedAt: null,
        },
      });
    }
  });

  const verified = await prisma.blogPost.findMany({
    where: { id: { in: prepared.map((row) => row.id) } },
    select: {
      id: true, status: true, publishedAt: true, lastReviewedAt: true, body: true,
      translations: { select: { id: true } },
    },
  });
  for (const row of prepared) {
    const saved = verified.find((item) => item.id === row.id);
    if (!saved || saved.status !== "DRAFT" || saved.publishedAt || saved.lastReviewedAt || saved.translations.length !== 0 || hash(saved.body) !== row.nextHash) {
      throw new Error(`${row.key}: post-write verification failed`);
    }
  }
  console.log(
    prepared.length === 6
      ? "VERIFIED: six DRAFT records updated; zero translations; nothing published"
      : `VERIFIED: ${prepared.length} DRAFT record(s) updated; zero translations; nothing published`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
