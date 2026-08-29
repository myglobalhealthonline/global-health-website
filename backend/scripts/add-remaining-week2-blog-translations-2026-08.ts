import "dotenv/config";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { sanitizeBlogHtml } from "../src/utils/sanitize-html.js";
import type { Locale, LocalePost, PostSet } from "./content/blog-seo-2026-08/types.js";
import { COVER_ALTS } from "./data/blog-cover-alts-2026-08.js";

const SEEDED_BY = "seed-week2-blog-drafts-2026-08";
const TEAM_BYLINE = "Global Health Medical Team";
const SUPPORTED_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const satisfies readonly Locale[];

export const EXPECTED_PRIMARY_IDS = new Map<string, string>([
  ["pt-baixa-medica-valor", "cmt8la5mj0000csjuzvvr49bg"],
  ["ie-illness-benefit-payment", "cmt8la96q0002csju6spj0o0n"],
  ["cz-vypocet-nemocenske", "cmt8ladb60004csjuxgxyk4nu"],
  ["pt-atestado-carta-conducao", "cmt8lahc30006csjuw55xnemg"],
  ["es-tension-alta-urgencias", "cmt8laldn0008csjufi90oq5x"],
  ["ro-scade-tensiunea-rapid", "cmt8lapi9000acsju2l7jkq5m"],
]);

export const EXPECTED_EXISTING_LOCALES = new Map<string, readonly Locale[]>([
  ["pt-baixa-medica-valor", ["EN", "DE"]],
  ["ie-illness-benefit-payment", ["RO", "ES", "PT", "DE"]],
  ["cz-vypocet-nemocenske", ["EN", "DE"]],
  ["pt-atestado-carta-conducao", ["EN", "DE"]],
  ["es-tension-alta-urgencias", ["EN", "DE"]],
  ["ro-scade-tensiunea-rapid", ["EN"]],
]);

export const EXPECTED_MISSING_LOCALES = new Map<string, readonly Locale[]>([
  ["pt-baixa-medica-valor", ["ES", "CS", "RO"]],
  ["ie-illness-benefit-payment", ["CS"]],
  ["cz-vypocet-nemocenske", ["PT", "ES", "RO"]],
  ["pt-atestado-carta-conducao", ["ES", "CS", "RO"]],
  ["es-tension-alta-urgencias", ["PT", "CS", "RO"]],
  ["ro-scade-tensiunea-rapid", ["PT", "ES", "CS", "DE"]],
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
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  coverImageAlt: string;
};

type TranslationSnapshot = {
  id: string;
  postId: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  coverImageAlt: string | null;
};

type ParentSnapshot = {
  id: string;
  key: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  authorDisplayName: string | null;
  status: string;
  isActive: boolean;
  publishedAt: Date | null;
  lastReviewedAt: Date | null;
  editorialChecklist: unknown;
  translations: TranslationSnapshot[];
};

type LocaleIdentity = { key: string; locale: string };
type BlogReadClient = Pick<typeof prisma, "blogPost" | "blogTranslation">;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const renderPost = (post: LocalePost) =>
  import("./content/blog-seo-2026-08/template.js").then((mod) => mod.renderArticle(post.article));

function primaryFor(set: PostSet): LocalePost {
  const primary = set.posts[0];
  if (!primary) throw new Error(`${set.key}: primary locale is missing`);
  return primary;
}

function checklistFor(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function assertExactSourceLocales(postSets: readonly PostSet[]): void {
  if (postSets.length !== 6 || EXPECTED_PRIMARY_IDS.size !== 6) {
    throw new Error("Remaining Week 2 importer expects six exact source sets and primary records");
  }

  for (const set of postSets) {
    const actual = sorted(set.posts.map((post) => post.locale));
    if (new Set(actual).size !== SUPPORTED_LOCALES.length || actual.join("|") !== sorted(SUPPORTED_LOCALES).join("|")) {
      throw new Error(`${set.key}: source does not contain exactly the six supported locales`);
    }
    const primary = primaryFor(set);
    const existing = EXPECTED_EXISTING_LOCALES.get(set.key);
    const missing = EXPECTED_MISSING_LOCALES.get(set.key);
    if (!existing || !missing || !EXPECTED_PRIMARY_IDS.has(set.key)) {
      throw new Error(`${set.key}: source is outside the exact Week 2 locale contract`);
    }
    const finalLocales = sorted([primary.locale, ...existing, ...missing]);
    if (new Set(finalLocales).size !== SUPPORTED_LOCALES.length || finalLocales.join("|") !== sorted(SUPPORTED_LOCALES).join("|")) {
      throw new Error(`${set.key}: base, existing and missing locale matrices do not resolve to six locales`);
    }
  }
}

function buildPlanForMatrix(
  postSets: readonly PostSet[],
  localesByKey: ReadonlyMap<string, readonly Locale[]>,
  expectedIds: ReadonlyMap<string, string>,
  coverKeyByTopic: Readonly<Record<string, string>>,
  coverAlts: Readonly<Record<string, Partial<Record<Locale, string>>>>,
  renderBody: (post: LocalePost) => string,
): PlannedTranslation[] {
  const rows: PlannedTranslation[] = [];
  const seenSlugs = new Set<string>();

  for (const set of postSets) {
    const postId = expectedIds.get(set.key);
    if (!postId) throw new Error(`${set.key}: missing expected primary record id`);
    const primary = primaryFor(set);
    const coverKey = coverKeyByTopic[set.key];
    const localizedCoverAlts = coverKey ? coverAlts[coverKey] : undefined;
    if (!coverKey || !localizedCoverAlts) throw new Error(`${set.key}: missing localized cover-alt source`);

    for (const locale of localesByKey.get(set.key) ?? []) {
      const post = set.posts.find((candidate) => candidate.locale === locale);
      if (!post) throw new Error(`${set.key}/${locale}: missing local translation source`);
      if (post.locale === primary.locale) throw new Error(`${set.key}: primary locale leaked into translation plan`);
      const coverImageAlt = localizedCoverAlts[locale];
      if (!coverImageAlt) throw new Error(`${set.key}/${locale}: missing localized cover alt`);
      if (seenSlugs.has(post.slug)) throw new Error(`${set.key}/${locale}: duplicate translation slug ${post.slug}`);
      seenSlugs.add(post.slug);
      const content = sanitizeBlogHtml(renderBody(post)) ?? "";
      if (!content.trim()) throw new Error(`${set.key}/${locale}: sanitized translation body is empty`);
      rows.push({
        key: set.key,
        postId,
        postLocale: primary.locale,
        locale,
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

  return rows;
}

export function buildRemainingWeek2TranslationPlan(
  postSets: readonly PostSet[],
  expectedIds: ReadonlyMap<string, string> = EXPECTED_PRIMARY_IDS,
  coverKeyByTopic: Readonly<Record<string, string>> = COVER_KEY_BY_TOPIC,
  coverAlts: Readonly<Record<string, Partial<Record<Locale, string>>>> = COVER_ALTS,
  renderBody: (post: LocalePost) => string,
): PlannedTranslation[] {
  assertExactSourceLocales(postSets);
  const rows = buildPlanForMatrix(postSets, EXPECTED_MISSING_LOCALES, expectedIds, coverKeyByTopic, coverAlts, renderBody);
  if (rows.length !== 17) throw new Error(`Remaining Week 2 importer expected 17 translations, received ${rows.length}`);
  return rows;
}

export function assertExpectedExistingLocaleMatrix(rows: readonly LocaleIdentity[]): void {
  const expected = [...EXPECTED_EXISTING_LOCALES.entries()]
    .flatMap(([key, locales]) => locales.map((locale) => `${key}:${locale}`))
    .sort();
  const actual = rows.map((row) => `${row.key}:${row.locale}`).sort();
  const duplicate = actual.find((pair, index) => pair === actual[index - 1]);
  if (duplicate) throw new Error(`Existing locale matrix contains duplicate ${duplicate}`);
  const unexpected = actual.filter((pair) => !expected.includes(pair));
  if (unexpected.length) throw new Error(`Existing locale matrix contains unexpected rows: ${unexpected.join(", ")}`);
  const missing = expected.filter((pair) => !actual.includes(pair));
  if (missing.length || actual.length !== expected.length) {
    throw new Error(`Existing locale matrix does not match expected rows; missing: ${missing.join(", ") || "none"}`);
  }
}

export function parseApplyFlag(argv: readonly string[]): boolean {
  return argv.includes("--apply");
}

function identityRows(parents: readonly ParentSnapshot[]): LocaleIdentity[] {
  return parents.flatMap((parent) => parent.translations.map((row) => ({ key: parent.key, locale: row.locale })));
}

async function loadParents(postSets: readonly PostSet[], tx: BlogReadClient = prisma): Promise<ParentSnapshot[]> {
  const parents = await tx.blogPost.findMany({
    where: { id: { in: [...EXPECTED_PRIMARY_IDS.values()] } },
    select: {
      id: true,
      slug: true,
      locale: true,
      title: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      authorDisplayName: true,
      status: true,
      isActive: true,
      publishedAt: true,
      lastReviewedAt: true,
      editorialChecklist: true,
      translations: {
        orderBy: { locale: "asc" },
        select: {
          id: true,
          postId: true,
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

  return postSets.map((set) => {
    const id = EXPECTED_PRIMARY_IDS.get(set.key);
    const parent = parents.find((row) => row.id === id);
    if (!id || !parent) throw new Error(`${set.key}: expected parent ${id ?? "unknown"} not found`);
    return { ...parent, key: set.key };
  });
}

function translationMismatch(row: TranslationSnapshot, expected: PlannedTranslation): boolean {
  return row.postId !== expected.postId ||
    row.locale !== expected.locale ||
    row.slug !== expected.slug ||
    row.title !== expected.title ||
    (row.excerpt ?? "") !== expected.excerpt ||
    (row.content ?? "") !== expected.content ||
    (row.seoTitle ?? "") !== expected.seoTitle ||
    (row.seoDesc ?? "") !== expected.seoDescription ||
    (row.coverImageAlt ?? "") !== expected.coverImageAlt;
}

function inspectParents(
  parents: readonly ParentSnapshot[],
  postSets: readonly PostSet[],
  expectedTranslations: readonly PlannedTranslation[],
  renderBody: (post: LocalePost) => string,
): string[] {
  const issues: string[] = [];
  for (const parent of parents) {
    const set = postSets.find((candidate) => candidate.key === parent.key);
    if (!set) {
      issues.push(`${parent.key}: missing local source set`);
      continue;
    }
    const primary = primaryFor(set);
    const checklist = checklistFor(parent.editorialChecklist);
    if (parent.status !== "DRAFT" && parent.status !== "PUBLISHED") {
      issues.push(`${set.key}: base record is neither DRAFT nor PUBLISHED`);
    }
    if (!parent.isActive) issues.push(`${set.key}: base record is inactive`);
    if (checklist.seededBy !== SEEDED_BY) issues.push(`${set.key}: base record is not owned by ${SEEDED_BY}`);
    if (parent.authorDisplayName !== TEAM_BYLINE) issues.push(`${set.key}: base author byline is not ${TEAM_BYLINE}`);
    if (parent.slug !== primary.slug || parent.locale !== primary.locale) issues.push(`${set.key}: base identity drifted`);
    if (parent.status === "DRAFT") {
      if (parent.publishedAt) issues.push(`${set.key}: DRAFT base record has publishedAt`);
      if (parent.lastReviewedAt) issues.push(`${set.key}: DRAFT base record has lastReviewedAt`);
      if (parent.title !== primary.title) issues.push(`${set.key}: base title drifted`);
      if ((parent.excerpt ?? "") !== primary.excerpt) issues.push(`${set.key}: base excerpt drifted`);
      if ((parent.seoTitle ?? "") !== primary.seoTitle) issues.push(`${set.key}: base SEO title drifted`);
      if ((parent.seoDescription ?? "") !== primary.seoDescription) issues.push(`${set.key}: base SEO description drifted`);
      if (hash(parent.body) !== hash(renderBody(primary))) issues.push(`${set.key}: base body no longer matches the approved source`);
    } else if (!parent.publishedAt || !parent.lastReviewedAt) {
      issues.push(`${set.key}: PUBLISHED base record is missing publish/review dates`);
    }

    const expectedForParent = expectedTranslations.filter((row) => row.key === set.key);
    if (parent.translations.length !== expectedForParent.length) {
      issues.push(`${set.key}: expected ${expectedForParent.length} translation rows, found ${parent.translations.length}`);
      continue;
    }
    for (const expected of expectedForParent) {
      const row = parent.translations.find((candidate) => candidate.locale === expected.locale);
      if (!row) issues.push(`${set.key}/${expected.locale}: expected translation is missing`);
      else if (parent.status === "DRAFT" && translationMismatch(row, expected)) {
        issues.push(`${set.key}/${expected.locale}: existing translation drifted from source`);
      }
    }
  }
  return issues;
}

async function assertNoSlugCollisions(plan: readonly PlannedTranslation[], tx: BlogReadClient = prisma): Promise<void> {
  const slugs = plan.map((row) => row.slug);
  const [posts, translations] = await Promise.all([
    tx.blogPost.findMany({ where: { slug: { in: slugs } }, select: { id: true, locale: true, slug: true } }),
    tx.blogTranslation.findMany({ where: { slug: { in: slugs } }, select: { id: true, locale: true, slug: true } }),
  ]);
  if (posts.length || translations.length) {
    const labels = [...posts.map((row) => `BlogPost ${row.id} ${row.locale} ${row.slug}`),
      ...translations.map((row) => `BlogTranslation ${row.id} ${row.locale} ${row.slug}`)];
    throw new Error(`Remaining Week 2 translation slug collision:\n- ${labels.join("\n- ")}`);
  }
}

function buildManifest(plan: readonly PlannedTranslation[]) {
  return plan.map((row) => ({ postId: row.postId, key: row.key, baseLocale: row.postLocale, locale: row.locale, slug: row.slug }));
}

async function preflight(
  postSets: readonly PostSet[],
  existingPlan: readonly PlannedTranslation[],
  missingPlan: readonly PlannedTranslation[],
  renderBody: (post: LocalePost) => string,
  tx: BlogReadClient = prisma,
): Promise<ParentSnapshot[]> {
  const parents = await loadParents(postSets, tx);
  assertExpectedExistingLocaleMatrix(identityRows(parents));
  const issues = inspectParents(parents, postSets, existingPlan, renderBody);
  if (issues.length) throw new Error(`REFUSING TO RUN\n- ${issues.join("\n- ")}`);
  await assertNoSlugCollisions(missingPlan, tx);
  return parents;
}

async function createTranslations(
  postSets: readonly PostSet[],
  existingPlan: readonly PlannedTranslation[],
  missingPlan: readonly PlannedTranslation[],
  renderBody: (post: LocalePost) => string,
): Promise<ParentSnapshot[]> {
  const parentIds = [...EXPECTED_PRIMARY_IDS.values()];
  return prisma.$transaction(async (tx) => {
    const lockedParents = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "BlogPost" WHERE "id" IN (${Prisma.join(parentIds)}) ORDER BY "id" FOR UPDATE`,
    );
    if (lockedParents.length !== parentIds.length) {
      throw new Error(`REFUSING TO APPLY: locked ${lockedParents.length} of ${parentIds.length} Week 2 parents`);
    }
    const lockedTranslations = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "BlogTranslation" WHERE "postId" IN (${Prisma.join(parentIds)}) ORDER BY "id" FOR UPDATE`,
    );
    if (lockedTranslations.length !== 13) {
      throw new Error(`REFUSING TO APPLY: locked ${lockedTranslations.length} existing translations, expected 13`);
    }

    const parents = await preflight(postSets, existingPlan, missingPlan, renderBody, tx);
    for (const row of missingPlan) {
      await tx.blogTranslation.create({
        data: {
          postId: row.postId,
          locale: row.locale,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          content: row.content,
          seoTitle: row.seoTitle,
          seoDesc: row.seoDescription,
          coverImageAlt: row.coverImageAlt,
        },
      });
    }
    return parents;
  }, { timeout: 30_000 });
}

function baseSnapshot(parent: ParentSnapshot): string {
  return JSON.stringify({
    id: parent.id,
    key: parent.key,
    slug: parent.slug,
    locale: parent.locale,
    title: parent.title,
    excerpt: parent.excerpt,
    body: parent.body,
    seoTitle: parent.seoTitle,
    seoDescription: parent.seoDescription,
    authorDisplayName: parent.authorDisplayName,
    status: parent.status,
    isActive: parent.isActive,
    publishedAt: parent.publishedAt?.toISOString() ?? null,
    lastReviewedAt: parent.lastReviewedAt?.toISOString() ?? null,
    editorialChecklist: parent.editorialChecklist,
  });
}

export function assertSnapshotsPreserved(
  beforeParents: readonly ParentSnapshot[],
  afterParents: readonly ParentSnapshot[],
): void {
  if (beforeParents.length !== afterParents.length) throw new Error("Parent snapshot count changed during import");
  for (const before of beforeParents) {
    const after = afterParents.find((candidate) => candidate.id === before.id);
    if (!after || baseSnapshot(before) !== baseSnapshot(after)) {
      throw new Error(`${before.key}: parent record changed during translation import`);
    }
    for (const beforeTranslation of before.translations) {
      const afterTranslation = after.translations.find((candidate) => candidate.id === beforeTranslation.id);
      if (!afterTranslation || JSON.stringify(beforeTranslation) !== JSON.stringify(afterTranslation)) {
        throw new Error(`${before.key}/${beforeTranslation.locale}: existing translation changed during import`);
      }
    }
  }
}

async function verifyReadback(
  postSets: readonly PostSet[],
  allTranslations: readonly PlannedTranslation[],
  missingTranslations: readonly PlannedTranslation[],
  beforeParents: readonly ParentSnapshot[],
): Promise<void> {
  const parents = await loadParents(postSets);
  const expectedPairs = allTranslations.map((row) => `${row.key}:${row.locale}`).sort();
  const actualPairs = identityRows(parents).map((row) => `${row.key}:${row.locale}`).sort();
  if (actualPairs.length !== 30 || actualPairs.join("|") !== expectedPairs.join("|")) {
    throw new Error("Readback locale matrix does not contain the exact 30 non-base Week 2 translations");
  }
  assertSnapshotsPreserved(beforeParents, parents);
  for (const expected of missingTranslations) {
    const parent = parents.find((candidate) => candidate.id === expected.postId);
    const row = parent?.translations.find((candidate) => candidate.locale === expected.locale);
    if (!row || translationMismatch(row, expected)) {
      throw new Error(`${expected.key}/${expected.locale}: new translation readback mismatch`);
    }
  }
  for (const parent of parents) {
    const baseLocale = parent.locale;
    const locales = sorted([baseLocale, ...parent.translations.map((row) => row.locale)]);
    if (locales.join("|") !== sorted(SUPPORTED_LOCALES).join("|")) {
      throw new Error(`${parent.key}: readback does not cover all six locales`);
    }
  }
}

export async function run(argv: readonly string[]): Promise<void> {
  const apply = parseApplyFlag(argv);
  const { WEEK2_RESEARCH_POST_SETS } = await import("./content/blog-week2-2026-08/index.js");
  const renderCache = new Map<LocalePost, string>();
  for (const set of WEEK2_RESEARCH_POST_SETS) {
    for (const post of set.posts) renderCache.set(post, await renderPost(post));
  }
  const renderer = (post: LocalePost) => {
    const body = renderCache.get(post);
    if (!body) throw new Error(`${post.slug}: render cache is missing the source body`);
    return body;
  };
  const postSets = WEEK2_RESEARCH_POST_SETS;
  assertExactSourceLocales(postSets);
  const existingPlan = buildPlanForMatrix(postSets, EXPECTED_EXISTING_LOCALES, EXPECTED_PRIMARY_IDS, COVER_KEY_BY_TOPIC, COVER_ALTS, renderer);
  const missingPlan = buildRemainingWeek2TranslationPlan(postSets, EXPECTED_PRIMARY_IDS, COVER_KEY_BY_TOPIC, COVER_ALTS, renderer);
  if (existingPlan.length !== 13) throw new Error(`Expected 13 existing source translations, received ${existingPlan.length}`);

  await preflight(postSets, existingPlan, missingPlan, renderer);
  console.log(`${apply ? "APPLY" : "DRY RUN"}: add the remaining 17 Week 2 BlogTranslation rows`);
  console.table(buildManifest(missingPlan));
  if (!apply) return;

  const beforeParents = await createTranslations(postSets, existingPlan, missingPlan, renderer);
  await verifyReadback(postSets, [...existingPlan, ...missingPlan], missingPlan, beforeParents);
  console.log("VERIFIED: 17 BlogTranslation rows created; 13 existing translations unchanged; six parent records unchanged; all six locales complete");
}

const isDirectRun = Boolean(
  process.argv[1] && /add-remaining-week2-blog-translations-2026-08\.(ts|js)$/.test(process.argv[1]),
);

if (isDirectRun) {
  run(process.argv.slice(2))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
