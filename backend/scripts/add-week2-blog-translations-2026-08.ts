import "dotenv/config";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { sanitizeBlogHtml } from "../src/utils/sanitize-html.js";
import type { Locale, LocalePost, PostSet } from "./content/blog-seo-2026-08/types.js";
import { COVER_ALTS } from "./data/blog-cover-alts-2026-08.js";

const SEEDED_BY = "seed-week2-blog-drafts-2026-08";

export const EXPECTED_PRIMARY_IDS = new Map<string, string>([
  ["pt-baixa-medica-valor", "cmt8la5mj0000csjuzvvr49bg"],
  ["ie-illness-benefit-payment", "cmt8la96q0002csju6spj0o0n"],
  ["cz-vypocet-nemocenske", "cmt8ladb60004csjuxgxyk4nu"],
  ["pt-atestado-carta-conducao", "cmt8lahc30006csjuw55xnemg"],
  ["es-tension-alta-urgencias", "cmt8laldn0008csjufi90oq5x"],
  ["ro-scade-tensiunea-rapid", "cmt8lapi9000acsju2l7jkq5m"],
]);

const COVER_KEY_BY_TOPIC: Readonly<Record<string, string>> = {
  "pt-baixa-medica-valor": "baixa-medica-calculo-do-valor-em-casa",
  "ie-illness-benefit-payment": "illness-benefit-ireland-payment-calendar-planning",
  "cz-vypocet-nemocenske": "vypocet-nemocenske-zamestnavatel-cssz-kalendar",
  "pt-atestado-carta-conducao": "atestado-carta-conducao-avaliacao-da-visao",
  "es-tension-alta-urgencias": "tension-alta-familiar-pide-ayuda-medica",
  "ro-scade-tensiunea-rapid": "tensiune-mare-repetare-masurare-sfat-medical",
};

export type PlannedTranslation = {
  key: string;
  postId: string;
  postLocale: Locale;
  postSlug: string;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  coverImageAlt: string | null;
};

export type ParentSnapshot = {
  id: string;
  key: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  isActive: boolean;
  publishedAt: Date | null;
  lastReviewedAt: Date | null;
  editorialChecklist: unknown;
  translations: Array<{ id: string; locale: string; slug: string }>;
};

type ManifestRow = {
  postId: string;
  key: string;
  baseLocale: string;
  locale: string;
  slug: string;
  title: string;
  hasCoverImageAlt: boolean;
};

type BlogReadClient = Pick<typeof prisma, "blogPost" | "blogTranslation">;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const renderPost = (post: LocalePost) => import("./content/blog-seo-2026-08/template.js").then((mod) => mod.renderArticle(post.article));

function primaryFor(set: PostSet): LocalePost {
  const primary = set.posts[0];
  if (!primary) throw new Error(`${set.key}: primary locale is missing`);
  return primary;
}

function checklistFor(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function buildWeek2TranslationPlan(
  postSets: readonly PostSet[],
  expectedIds: ReadonlyMap<string, string> = EXPECTED_PRIMARY_IDS,
  coverKeyByTopic: Readonly<Record<string, string>> = COVER_KEY_BY_TOPIC,
  coverAlts: Readonly<Record<string, Partial<Record<Locale, string>>>> = COVER_ALTS,
  renderBody: (post: LocalePost) => string,
): PlannedTranslation[] {
  if (postSets.length !== 6 || expectedIds.size !== 6) {
    throw new Error("Week 2 translation importer expects six exact primary records");
  }

  const rows: PlannedTranslation[] = [];
  const seenSlugs = new Set<string>();

  for (const set of postSets) {
    const postId = expectedIds.get(set.key);
    if (!postId) throw new Error(`${set.key}: missing expected primary record id`);
    const primary = primaryFor(set);
    const coverKey = coverKeyByTopic[set.key];
    if (!coverKey) throw new Error(`${set.key}: missing cover key`);
    const localizedCoverAlts = coverAlts[coverKey];
    if (!localizedCoverAlts) throw new Error(`${set.key}: missing cover alts for ${coverKey}`);
    for (const post of set.posts.slice(1)) {
      if (post.locale === primary.locale) {
        throw new Error(`${set.key}: primary locale leaked into translation plan`);
      }
      const coverImageAlt = localizedCoverAlts[post.locale];
      if (!coverImageAlt) {
        throw new Error(`${set.key}/${post.locale}: missing localized cover alt for ${coverKey}`);
      }
      if (seenSlugs.has(post.slug)) throw new Error(`${set.key}/${post.locale}: duplicate translation slug ${post.slug}`);
      seenSlugs.add(post.slug);
      const content = sanitizeBlogHtml(renderBody(post)) ?? "";
      if (!content.trim()) {
        throw new Error(`${set.key}/${post.locale}: sanitized translation body is empty`);
      }
      rows.push({
        key: set.key,
        postId,
        postLocale: primary.locale,
        postSlug: primary.slug,
        locale: post.locale,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        coverImageAlt,
      });
    }
  }

  if (rows.length !== 13) {
    throw new Error(`Week 2 translation importer expected 13 approved translations, received ${rows.length}`);
  }

  return rows;
}

export function inspectParentSnapshot(
  parent: ParentSnapshot,
  set: PostSet,
  renderBody: (post: LocalePost) => string,
): string[] {
  const issues: string[] = [];
  const primary = primaryFor(set);
  const currentChecklist = checklistFor(parent.editorialChecklist);
  const expectedBody = renderBody(primary);
  const expectedHash = hash(expectedBody);

  if (parent.status !== "DRAFT") issues.push(`${set.key}: base record is not DRAFT`);
  if (!parent.isActive) issues.push(`${set.key}: base record is inactive`);
  if (parent.publishedAt) issues.push(`${set.key}: base record already has publishedAt`);
  if (parent.lastReviewedAt) issues.push(`${set.key}: base record already has lastReviewedAt`);
  if (parent.translations.length !== 0) issues.push(`${set.key}: translation rows already exist`);
  if (currentChecklist.seededBy !== SEEDED_BY) issues.push(`${set.key}: base record is not owned by ${SEEDED_BY}`);
  if (currentChecklist.seedHash !== hash(parent.body)) issues.push(`${set.key}: base record body changed after seeding`);
  if (parent.slug !== primary.slug || parent.locale !== primary.locale) issues.push(`${set.key}: base record identity drifted`);
  if (parent.title !== primary.title) issues.push(`${set.key}: base title changed after seeding`);
  if ((parent.excerpt ?? "") !== primary.excerpt) issues.push(`${set.key}: base excerpt changed after seeding`);
  if ((parent.seoTitle ?? "") !== primary.seoTitle) issues.push(`${set.key}: base SEO title changed after seeding`);
  if ((parent.seoDescription ?? "") !== primary.seoDescription) issues.push(`${set.key}: base SEO description changed after seeding`);
  if (hash(parent.body) !== expectedHash) issues.push(`${set.key}: base body no longer matches the approved Week 2 source`);

  return issues;
}

export function buildManifest(plan: readonly PlannedTranslation[]): ManifestRow[] {
  return plan.map((row) => ({
    postId: row.postId,
    key: row.key,
    baseLocale: row.postLocale,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    hasCoverImageAlt: Boolean(row.coverImageAlt),
  }));
}

async function loadParents(postSets: readonly PostSet[], tx: BlogReadClient = prisma): Promise<ParentSnapshot[]> {
  const ids = [...EXPECTED_PRIMARY_IDS.values()];
  const parents = await tx.blogPost.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      locale: true,
      title: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      status: true,
      isActive: true,
      publishedAt: true,
      lastReviewedAt: true,
      editorialChecklist: true,
      translations: { select: { id: true, locale: true, slug: true } },
    },
  });

  return postSets.map((set) => {
    const id = EXPECTED_PRIMARY_IDS.get(set.key)!;
    const parent = parents.find((row) => row.id === id);
    if (!parent) throw new Error(`${set.key}: expected parent ${id} not found`);
    return { ...parent, key: set.key };
  });
}

async function assertNoSlugCollisions(plan: readonly PlannedTranslation[], tx: BlogReadClient = prisma): Promise<void> {
  const slugs = plan.map((row) => row.slug);
  const [posts, translations] = await Promise.all([
    tx.blogPost.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, locale: true },
    }),
    tx.blogTranslation.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, postId: true, slug: true, locale: true },
    }),
  ]);

  if (posts.length || translations.length) {
    const labels = [
      ...posts.map((row) => `BlogPost ${row.id} ${row.locale} ${row.slug}`),
      ...translations.map((row) => `BlogTranslation ${row.id} ${row.locale} ${row.slug}`),
    ];
    throw new Error(`Week 2 translation slug collision detected:\n- ${labels.join("\n- ")}`);
  }
}

async function createTranslations(
  plan: readonly PlannedTranslation[],
  postSets: readonly PostSet[],
  renderBody: (post: LocalePost) => string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const parentIds = postSets.map((set) => {
      const id = EXPECTED_PRIMARY_IDS.get(set.key);
      if (!id) throw new Error(`${set.key}: missing expected primary record id`);
      return id;
    });
    const lockedParents = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "BlogPost" WHERE "id" IN (${Prisma.join(parentIds)}) ORDER BY "id" FOR UPDATE`,
    );
    if (lockedParents.length !== parentIds.length) {
      throw new Error(`REFUSING TO APPLY: locked ${lockedParents.length} of ${parentIds.length} Week 2 parents`);
    }
    const parents = await loadParents(postSets, tx);
    const issues = parents.flatMap((parent) => {
      const set = postSets.find((item) => item.key === parent.key);
      if (!set) return [`${parent.key}: missing local source set`];
      return inspectParentSnapshot(parent, set, renderBody);
    });
    if (issues.length) {
      throw new Error(`REFUSING TO APPLY\n- ${issues.join("\n- ")}`);
    }

    await assertNoSlugCollisions(plan, tx);

    for (const row of plan) {
      await tx.blogTranslation.create({
        data: {
          postId: row.postId,
          locale: row.locale,
          title: row.title,
          slug: row.slug,
          excerpt: row.excerpt,
          content: row.content,
          seoTitle: row.seoTitle,
          seoDesc: row.seoDescription,
          ...(row.coverImageAlt ? { coverImageAlt: row.coverImageAlt } : {}),
        },
      });
    }
  }, { timeout: 30_000 });
}

async function verifyReadback(
  plan: readonly PlannedTranslation[],
  postSets: readonly PostSet[],
  renderBody: (post: LocalePost) => string,
): Promise<void> {
  const rows = await prisma.blogPost.findMany({
    where: { id: { in: [...EXPECTED_PRIMARY_IDS.values()] } },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      lastReviewedAt: true,
      slug: true,
      locale: true,
      title: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      translations: {
        orderBy: [{ locale: "asc" }],
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

  for (const set of postSets) {
    const id = EXPECTED_PRIMARY_IDS.get(set.key)!;
    const current = rows.find((row) => row.id === id);
    const primary = primaryFor(set);
    if (!current) throw new Error(`${set.key}: parent missing after apply`);
    if (current.status !== "DRAFT" || current.publishedAt || current.lastReviewedAt) {
      throw new Error(`${set.key}: parent state changed during translation import`);
    }
    if (
      current.slug !== primary.slug ||
      current.locale !== primary.locale ||
      current.title !== primary.title ||
      (current.excerpt ?? "") !== primary.excerpt ||
      (current.seoTitle ?? "") !== primary.seoTitle ||
      (current.seoDescription ?? "") !== primary.seoDescription ||
      hash(current.body) !== hash(renderBody(primary))
    ) {
      throw new Error(`${set.key}: parent record mutated during translation import`);
    }
  }

  for (const row of plan) {
    const current = rows.find((item) => item.id === row.postId);
    const translation = current?.translations.find((item) => item.locale === row.locale);
    if (!current || !translation) throw new Error(`${row.key}/${row.locale}: translation missing after apply`);
    if (
      translation.slug !== row.slug ||
      translation.title !== row.title ||
      (translation.excerpt ?? "") !== row.excerpt ||
      (translation.content ?? "") !== row.content ||
      (translation.seoTitle ?? "") !== row.seoTitle ||
      (translation.seoDesc ?? "") !== row.seoDescription ||
      (translation.coverImageAlt ?? null) !== row.coverImageAlt
    ) {
      throw new Error(`${row.key}/${row.locale}: translation readback mismatch`);
    }
  }
}

export async function run(argv: readonly string[]): Promise<void> {
  const apply = argv.includes("--apply");
  const { WEEK2_POST_SETS } = await import("./content/blog-week2-2026-08/index.js");
  const renderer = (post: LocalePost) => {
    const entry = renderCache.get(post);
    if (!entry) throw new Error("render cache missing post body");
    return entry;
  };
  const renderCache = new Map<LocalePost, string>();
  for (const set of WEEK2_POST_SETS) {
    for (const post of set.posts) {
      renderCache.set(post, await renderPost(post));
    }
  }
  const postSets = WEEK2_POST_SETS;
  const plan = buildWeek2TranslationPlan(postSets, EXPECTED_PRIMARY_IDS, COVER_KEY_BY_TOPIC, COVER_ALTS, renderer);
  const parents = await loadParents(postSets);

  const issues = parents.flatMap((parent) => {
    const set = postSets.find((item) => item.key === parent.key);
    if (!set) return [`${parent.key}: missing local source set`];
    return inspectParentSnapshot(parent, set, renderer);
  });
  if (issues.length) {
    throw new Error(`REFUSING TO RUN\n- ${issues.join("\n- ")}`);
  }

  await assertNoSlugCollisions(plan);

  console.log(`${apply ? "APPLY" : "DRY RUN"}: add 13 approved Week 2 BlogTranslation rows`);
  console.table(buildManifest(plan));

  if (!apply) return;

  await createTranslations(plan, postSets, renderer);
  await verifyReadback(plan, postSets, renderer);
  console.log("VERIFIED: 13 BlogTranslation rows created; six DRAFT parents unchanged; zero unapproved locales");
}

const isDirectRun = Boolean(
  process.argv[1] && /add-week2-blog-translations-2026-08\.(ts|js)$/.test(process.argv[1]),
);

if (isDirectRun) {
  run(process.argv.slice(2))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
