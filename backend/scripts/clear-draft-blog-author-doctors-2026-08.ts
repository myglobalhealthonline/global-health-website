import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

export const TEAM_BYLINE = "Global Health Medical Team";

export const EXPECTED_DRAFT_IDS = new Map<string, string>([
  ["cmt8la5mj0000csjuzvvr49bg", "baixa-medica-quanto-se-recebe-como-calcular"],
  ["cmt8la96q0002csju6spj0o0n", "illness-benefit-payment-ireland-rate-tax-timing"],
  ["cmt8ladb60004csjuxgxyk4nu", "vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz"],
  ["cmt8lahc30006csjuw55xnemg", "atestado-medico-para-carta-de-conducao"],
  ["cmt8laldn0008csjufi90oq5x", "tension-alta-sintomas-cuando-urgencias"],
  ["cmt8lapi9000acsju2l7jkq5m", "ce-scade-tensiunea-arteriala-rapid-sigur"],
]);

type DraftAuthorIdentity = {
  id: string;
  slug: string;
  status: string;
  authorDisplayName: string | null;
  authorDoctorId: string | null;
  reviewerDoctorId: string | null;
};

type DraftSnapshot = DraftAuthorIdentity & {
  title: string;
  excerpt: string | null;
  body: string;
  locale: string;
  category: string | null;
  reviewerDisplayName: string | null;
  ctaServiceId: string | null;
  coverAssetId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  lastReviewedAt: Date | null;
  editorialChecklist: unknown;
  isActive: boolean;
  translations: Array<{
    id: string;
    locale: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    seoTitle: string | null;
    seoDesc: string | null;
    coverImageAlt: string | null;
  }>;
};

type BlogReadClient = Pick<typeof prisma, "blogPost">;

export function parseApplyFlag(argv: readonly string[]): boolean {
  return argv.includes("--apply");
}

export function inspectDraftAuthorRows(rows: readonly DraftAuthorIdentity[]): string[] {
  const issues: string[] = [];
  if (rows.length !== EXPECTED_DRAFT_IDS.size) {
    issues.push(`expected ${EXPECTED_DRAFT_IDS.size} exact DRAFT rows, found ${rows.length}`);
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) issues.push(`${row.id}: duplicate DRAFT row`);
    seen.add(row.id);
    const expectedSlug = EXPECTED_DRAFT_IDS.get(row.id);
    if (!expectedSlug || expectedSlug !== row.slug) issues.push(`${row.id}: unexpected draft identity ${row.slug}`);
    if (row.status !== "DRAFT") issues.push(`${row.slug}: record is not DRAFT`);
    if (row.authorDisplayName !== TEAM_BYLINE) issues.push(`${row.slug}: author display name is not ${TEAM_BYLINE}`);
  }
  for (const id of EXPECTED_DRAFT_IDS.keys()) {
    if (!seen.has(id)) issues.push(`${id}: expected DRAFT record is missing`);
  }
  return issues;
}

async function loadDrafts(tx: BlogReadClient = prisma): Promise<DraftSnapshot[]> {
  return tx.blogPost.findMany({
    where: { status: "DRAFT" },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      status: true,
      locale: true,
      category: true,
      authorDisplayName: true,
      reviewerDisplayName: true,
      authorDoctorId: true,
      reviewerDoctorId: true,
      ctaServiceId: true,
      coverAssetId: true,
      seoTitle: true,
      seoDescription: true,
      publishedAt: true,
      lastReviewedAt: true,
      editorialChecklist: true,
      isActive: true,
      translations: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          locale: true,
          slug: true,
          title: true,
          excerpt: true,
          content: true,
          seoTitle: true,
          seoDesc: true,
          coverImageAlt: true,
        },
      },
    },
  });
}

function preservedSnapshot(row: DraftSnapshot): string {
  return JSON.stringify({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    locale: row.locale,
    category: row.category,
    reviewerDisplayName: row.reviewerDisplayName,
    reviewerDoctorId: row.reviewerDoctorId,
    ctaServiceId: row.ctaServiceId,
    coverAssetId: row.coverAssetId,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    editorialChecklist: row.editorialChecklist,
    isActive: row.isActive,
    translations: row.translations,
  });
}

export function assertSnapshotsPreserved(before: readonly DraftSnapshot[], after: readonly DraftSnapshot[]): void {
  if (before.length !== after.length) throw new Error("DRAFT inventory changed during author migration");
  for (const previous of before) {
    const current = after.find((row) => row.id === previous.id);
    if (!current) throw new Error(`${previous.slug}: DRAFT disappeared during author migration`);
    if (preservedSnapshot(previous) !== preservedSnapshot(current)) {
      throw new Error(`${previous.slug}: a non-author field changed during author migration`);
    }
    if (current.authorDisplayName !== TEAM_BYLINE || current.authorDoctorId !== null) {
      throw new Error(`${previous.slug}: final author attribution is not team-only`);
    }
  }
}

function assertValidDrafts(rows: readonly DraftSnapshot[]): void {
  const issues = inspectDraftAuthorRows(rows);
  if (issues.length) throw new Error(`REFUSING TO RUN\n- ${issues.join("\n- ")}`);
}

function manifest(rows: readonly DraftSnapshot[]) {
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    authorDisplayName: row.authorDisplayName,
    authorDoctorAction: row.authorDoctorId ? "clear" : "already-none",
    reviewerDoctorPreserved: Boolean(row.reviewerDoctorId),
    translationsPreserved: row.translations.length,
  }));
}

async function applyDraftAuthorMigration(): Promise<void> {
  const ids = [...EXPECTED_DRAFT_IDS.keys()];
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "BlogPost" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`,
    );
    if (locked.length !== ids.length) throw new Error(`locked ${locked.length} of ${ids.length} expected DRAFT rows`);

    const before = await loadDrafts(tx);
    assertValidDrafts(before);
    for (const row of before) {
      if (row.authorDoctorId === null) continue;
      await tx.blogPost.update({
        where: { id: row.id },
        data: {
          authorDisplayName: TEAM_BYLINE,
          authorDoctorId: null,
        },
      });
    }
    const after = await loadDrafts(tx);
    assertSnapshotsPreserved(before, after);
  }, { timeout: 30_000 });
}

export async function run(argv: readonly string[]): Promise<void> {
  const apply = parseApplyFlag(argv);
  const drafts = await loadDrafts();
  assertValidDrafts(drafts);
  console.log(`${apply ? "APPLY" : "DRY RUN"}: make ${drafts.length} DRAFT blog authors team-only`);
  console.table(manifest(drafts));
  if (!apply) return;

  await applyDraftAuthorMigration();
  const readback = await loadDrafts();
  assertSnapshotsPreserved(drafts, readback);
  console.log("VERIFIED: six DRAFT authors are Global Health Medical Team; author-doctor links cleared; reviewer links and 30 translations preserved");
}

const isDirectRun = Boolean(
  process.argv[1] && /clear-draft-blog-author-doctors-2026-08\.(ts|js)$/.test(process.argv[1]),
);

if (isDirectRun) {
  run(process.argv.slice(2))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
