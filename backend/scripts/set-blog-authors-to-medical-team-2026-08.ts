import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

export const TEAM_BYLINE = "Global Health Medical Team";
const EXPECTED_MAX_EMBEDDED_AUTHOR_CARDS = 121;
const EXPECTED_TRANSLATION_ROWS = 134;

const EMBEDDED_AUTHOR_CARD =
  /<div class="hero-author"><div aria-hidden="true" class="hero-author-mark">[^<]*<\/div><div><strong>[^<]*<\/strong><span>[^<]*<\/span><\/div><\/div>/g;
const TEAM_AUTHOR_CARD =
  '<div class="hero-author"><div aria-hidden="true" class="hero-author-mark">GH</div>' +
  `<div><strong>${TEAM_BYLINE}</strong></div></div>`;

export function normalizeEmbeddedAuthorByline(html: string): string {
  return html.replace(EMBEDDED_AUTHOR_CARD, TEAM_AUTHOR_CARD);
}

const EXPECTED_BLOG_IDS = [
  "cmq1wgcik0001l4ju9aagdq2i",
  "cmrqkwy59002g01s1jghvbgpf",
  "cmrrdr87a00ie01o27htkdrsp",
  "cmrrei76y03me01phamppepo8",
  "cmrreuzhq03mj01phj0zanqan",
  "cmrrg2eng010p01qfm8ug25r6",
  "cmrt6cg671p5w01rp09ixrs8j",
  "cmrts0esr053y01s67juhozvm",
  "cmrz2wo4n0000i4jus3ulmjdu",
  "cmrz2wp9j0001i4jukz2rqph8",
  "cmsep1bn500007ojufmljevml",
  "cmsep1jon000c7oju6dmz0d19",
  "cmsep1rbz000o7ojuqrozzvnk",
  "cmsep1slb000q7ojuna9x1ial",
  "cmsep1tul000s7oju93cl031b",
  "cmsep1v3w000u7ojup3wgel9j",
  "cmsep1wdl000w7ojuxnaqgunp",
  "cmsep1xp7000y7ojurww7fyuv",
  "cmsep1yyy00107ojul6p4ekqo",
  "cmsep20bc00127ojuiziucamx",
  "cmsep21ml00147ojuta749y9g",
  "cmsep22zg00167ojubykxcgpk",
  "cmt5txqqn0000s8ju2rz5zg1u",
  "cmt5txspa0002s8julxban3bz",
  "cmt8la5mj0000csjuzvvr49bg",
  "cmt8la96q0002csju6spj0o0n",
  "cmt8ladb60004csjuxgxyk4nu",
  "cmt8lahc30006csjuw55xnemg",
  "cmt8laldn0008csjufi90oq5x",
  "cmt8lapi9000acsju2l7jkq5m",
] as const;

type BlogAuthorSnapshot = {
  id: string;
  slug: string;
  status: string;
  body: string;
  authorDisplayName: string | null;
  authorDoctorId: string | null;
  reviewerDoctorId: string | null;
  translations: Array<{
    id: string;
    locale: string;
    slug: string;
    content: string | null;
  }>;
};

const snapshotSelect = {
  id: true,
  slug: true,
  status: true,
  body: true,
  authorDisplayName: true,
  authorDoctorId: true,
  reviewerDoctorId: true,
  translations: {
    select: { id: true, locale: true, slug: true, content: true },
    orderBy: { id: "asc" },
  },
} as const;

function assertExactInventory(rows: readonly BlogAuthorSnapshot[]): void {
  const actualIds = rows.map((row) => row.id).sort();
  const expectedIds = [...EXPECTED_BLOG_IDS].sort();
  if (actualIds.length !== expectedIds.length || actualIds.some((id, index) => id !== expectedIds[index])) {
    throw new Error(
      `REFUSING TO RUN: production blog inventory changed (expected ${expectedIds.length}, found ${actualIds.length})`,
    );
  }
}

function assertClinicalRelationshipsUnchanged(
  before: readonly BlogAuthorSnapshot[],
  after: readonly BlogAuthorSnapshot[],
): void {
  for (const previous of before) {
    const current = after.find((row) => row.id === previous.id);
    if (
      !current ||
      current.authorDoctorId !== previous.authorDoctorId ||
      current.reviewerDoctorId !== previous.reviewerDoctorId
    ) {
      throw new Error(`${previous.slug}: clinical relationships changed`);
    }
  }
}

async function loadInventory(): Promise<BlogAuthorSnapshot[]> {
  return prisma.blogPost.findMany({ select: snapshotSelect, orderBy: { id: "asc" } });
}

function buildEmbeddedAuthorUpdates(rows: readonly BlogAuthorSnapshot[]) {
  return rows.flatMap((row) => {
    const normalizedBody = normalizeEmbeddedAuthorByline(row.body);
    const bodyUpdate = normalizedBody === row.body
      ? []
      : [{ kind: "post" as const, id: row.id, slug: row.slug, html: normalizedBody }];
    const translationUpdates = row.translations.flatMap((translation) => {
      if (!translation.content) return [];
      const normalizedContent = normalizeEmbeddedAuthorByline(translation.content);
      return normalizedContent === translation.content
        ? []
        : [{
            kind: "translation" as const,
            id: translation.id,
            slug: translation.slug,
            locale: translation.locale,
            html: normalizedContent,
          }];
    });
    return [...bodyUpdate, ...translationUpdates];
  });
}

export async function run(argv: readonly string[]): Promise<void> {
  const apply = argv.includes("--apply");
  const before = await loadInventory();
  assertExactInventory(before);
  const embeddedUpdates = buildEmbeddedAuthorUpdates(before);
  if (embeddedUpdates.length > EXPECTED_MAX_EMBEDDED_AUTHOR_CARDS) {
    throw new Error(
      `REFUSING TO RUN: expected at most ${EXPECTED_MAX_EMBEDDED_AUTHOR_CARDS} embedded author cards, found ${embeddedUpdates.length}`,
    );
  }

  console.log(
    `${apply ? "APPLY" : "DRY RUN"}: set ${before.length} blog authors and ${embeddedUpdates.length} embedded bylines to ${TEAM_BYLINE}`,
  );
  console.table(
    before.map((row) => ({
      slug: row.slug,
      status: row.status,
      previousAuthor: row.authorDisplayName,
      nextAuthor: TEAM_BYLINE,
      authorDoctorPreserved: Boolean(row.authorDoctorId),
      reviewerDoctorPreserved: Boolean(row.reviewerDoctorId),
    })),
  );

  if (!apply) return;

  await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "BlogPost" WHERE id IN (${Prisma.join([...EXPECTED_BLOG_IDS])}) ORDER BY id FOR UPDATE`,
      );
      if (locked.length !== EXPECTED_BLOG_IDS.length) {
        throw new Error(`REFUSING TO RUN: locked ${locked.length} of ${EXPECTED_BLOG_IDS.length} expected blogs`);
      }
      const lockedTranslations = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "BlogTranslation" WHERE "postId" IN (${Prisma.join([...EXPECTED_BLOG_IDS])}) ORDER BY id FOR UPDATE`,
      );
      if (lockedTranslations.length !== EXPECTED_TRANSLATION_ROWS) {
        throw new Error(
          `REFUSING TO RUN: locked ${lockedTranslations.length} of ${EXPECTED_TRANSLATION_ROWS} expected translations`,
        );
      }

      const transactionBefore = await tx.blogPost.findMany({
        select: snapshotSelect,
        orderBy: { id: "asc" },
      });
      assertExactInventory(transactionBefore);
      assertClinicalRelationshipsUnchanged(before, transactionBefore);
      const transactionEmbeddedUpdates = buildEmbeddedAuthorUpdates(transactionBefore);
      if (transactionEmbeddedUpdates.length > EXPECTED_MAX_EMBEDDED_AUTHOR_CARDS) {
        throw new Error("REFUSING TO RUN: embedded author cards changed before apply");
      }

      const result = await tx.blogPost.updateMany({
        where: { id: { in: [...EXPECTED_BLOG_IDS] } },
        data: { authorDisplayName: TEAM_BYLINE },
      });
      if (result.count !== EXPECTED_BLOG_IDS.length) {
        throw new Error(`Expected to update ${EXPECTED_BLOG_IDS.length} blogs, updated ${result.count}`);
      }

      for (const update of transactionEmbeddedUpdates) {
        if (update.kind === "post") {
          await tx.blogPost.update({ where: { id: update.id }, data: { body: update.html } });
        } else {
          await tx.blogTranslation.update({ where: { id: update.id }, data: { content: update.html } });
        }
      }
    },
    { timeout: 120_000 },
  );

  const after = await loadInventory();
  assertExactInventory(after);
  assertClinicalRelationshipsUnchanged(before, after);
  if (after.some((row) => row.authorDisplayName !== TEAM_BYLINE)) {
    throw new Error("Blog author readback mismatch");
  }
  if (buildEmbeddedAuthorUpdates(after).length !== 0) {
    throw new Error("Embedded blog author readback mismatch");
  }
  console.log(
    `VERIFIED: all ${after.length} blogs and ${embeddedUpdates.length} embedded bylines use ${TEAM_BYLINE}; clinical relationships unchanged`,
  );
}

const isDirectRun = Boolean(
  process.argv[1] && /set-blog-authors-to-medical-team-2026-08\.(ts|js)$/.test(process.argv[1]),
);

if (isDirectRun) {
  run(process.argv.slice(2))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
