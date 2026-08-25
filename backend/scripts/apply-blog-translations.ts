import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "../src/db/prisma.js";
import {
  assertApplySafe,
  groupDrafts,
  normalize,
  planGroup,
  slugCandidate,
  type Draft,
  type RawDraft,
  type SourcePost,
} from "./apply-blog-translations-lib.js";

// Applies JSONL translation drafts for entity=blog (produced by
// draft-i18n-translations-openai.ts --entity=blog) to BlogTranslation.
// Field names on a blog draft are BlogPost column names (body,
// seoDescription, coverAlt); this maps them to the BlogTranslation columns
// (content, seoDesc, coverImageAlt) they actually write to. Same
// never-overwrite-a-meaningful-value rule as apply-i18n-drafts.ts. The slug
// isn't drafted by OpenAI — it's derived from the translated title here.

// NFKD-strip diacritics (é->e, ř->r via combining-mark removal, etc.), plus
// the couple of Latin-1/German/Romanian letters that don't decompose that way.
function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function loadDrafts(files: string[]): Draft[] {
  const drafts: Draft[] = [];
  for (const file of files) {
    if (!existsSync(file)) throw new Error(`Draft file not found: ${file}`);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const draft = normalize(JSON.parse(line) as RawDraft, file);
      if (draft) drafts.push(draft);
    }
  }
  return drafts;
}

async function uniqueSlug(base: string, locale: string, taken: Set<string>): Promise<string> {
  let candidate = slugCandidate(base);
  let suffix = 2;
  while (
    taken.has(candidate) ||
    (await prisma.blogPost.count({ where: { slug: candidate, locale: locale as never } })) > 0 ||
    (await prisma.blogTranslation.count({ where: { slug: candidate, locale } })) > 0
  ) {
    candidate = slugCandidate(base, suffix++);
  }
  taken.add(candidate);
  return candidate;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const fileArg = process.argv.filter((arg) => arg.startsWith("--file=")).map((arg) => arg.slice("--file=".length));
  const files = [...fileArg, ...(argValue("file")?.split(",") ?? [])].filter(Boolean).map((f) => f.trim()).filter(Boolean);
  const uniqueFiles = [...new Set(files)];
  if (uniqueFiles.length === 0) {
    console.error("Usage: apply-blog-translations.ts --file=<path.jsonl>[,<path.jsonl>...] [--dry-run] [--include-flagged] [--allow-draft-source] [--yes] [--approve-human-review]");
    process.exit(1);
  }
  const dryRun = args.has("--dry-run");
  const includeFlagged = args.has("--include-flagged");
  const approveHumanReview = args.has("--approve-human-review");
  const allowDraftSource = args.has("--allow-draft-source");

  if (!dryRun && !args.has("--yes")) {
    console.error("Refusing to write to production: re-run with --yes after reviewing a --dry-run pass.");
    process.exit(1);
  }

  const drafts = loadDrafts(uniqueFiles);
  const groups = groupDrafts(drafts);
  console.log(`Loaded ${drafts.length} blog draft record(s) from ${uniqueFiles.length} file(s) into ${groups.size} post/locale group(s).`);

  const postIds = [...new Set([...groups.values()].map((g) => g.postId))];
  const posts = await prisma.blogPost.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      status: true,
      isActive: true,
      title: true,
      excerpt: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      coverAsset: { select: { altText: true } },
    },
  });
  const postsById = new Map(posts.map((post) => [post.id, post as SourcePost]));

  const existingTranslations = await prisma.blogTranslation.findMany({ where: { postId: { in: postIds } } });
  const existingByKey = new Map(existingTranslations.map((row) => [`${row.postId}:${row.locale}`, row]));

  const takenSlugs = new Set<string>();

  let wouldCreate = 0, wouldUpdate = 0, fieldWrites = 0, skippedExisting = 0, skippedFlagged = 0, orphanDrafts = 0;
  let orphanGroups = 0, inactiveGroups = 0, inactiveDrafts = 0, staleGroups = 0, staleFields = 0, reviewFields = 0;
  const perLocale = new Map<string, number>();
  const planned: Array<{
    group: (typeof groups extends Map<string, infer G> ? G : never);
    existingRow: (typeof existingTranslations)[number] | undefined;
    applied: Record<string, string>;
    slug?: string;
  }> = [];

  for (const group of groups.values()) {
    const existingRow = existingByKey.get(`${group.postId}:${group.targetLocale}`);
    const plan = planGroup(group, postsById.get(group.postId), existingRow, includeFlagged, allowDraftSource);
    skippedExisting += plan.skippedExisting;
    skippedFlagged += plan.skippedFlagged;

    if (plan.status === "orphan") {
      orphanGroups++;
      orphanDrafts += group.fields.size;
      console.warn(`SKIP orphan draft(s): BlogPost ${group.postId} not found (locale=${group.targetLocale})`);
      continue;
    }
    if (plan.status === "inactive") {
      inactiveGroups++;
      inactiveDrafts += group.fields.size;
      console.warn(`SKIP inactive/unpublished source: BlogPost ${group.postId} (locale=${group.targetLocale})`);
      continue;
    }
    if (plan.status === "stale") {
      staleGroups++;
      staleFields += plan.staleFields;
      console.warn(`SKIP stale source: BlogPost ${group.postId} (locale=${group.targetLocale}, staleFields=${plan.staleFields})`);
      continue;
    }
    if (plan.status === "missing-title") {
      console.warn(`SKIP create for blog post ${group.slug} ${group.targetLocale}: missing required field "title"`);
      continue;
    }
    if (plan.status === "no-op") continue;

    const fieldCount = Object.keys(plan.applied).length;
    reviewFields += plan.reviewFields;
    fieldWrites += fieldCount;
    perLocale.set(group.targetLocale, (perLocale.get(group.targetLocale) ?? 0) + fieldCount);
    if (existingRow) {
      wouldUpdate++;
      planned.push({ group, existingRow, applied: plan.applied });
    } else {
      wouldCreate++;
      const slug = await uniqueSlug(slugify(plan.applied.title), group.targetLocale, takenSlugs);
      planned.push({ group, existingRow, applied: plan.applied, slug });
      if (dryRun) {
        console.log(`  would create ${group.slug} -> ${group.targetLocale} slug="${slug}" fields=${Object.keys(plan.applied).join(",")}`);
      }
    }
  }

  console.log(`\n${dryRun ? "DRY RUN" : "PREFLIGHT"} summary`);
  console.log(`wouldCreate=${wouldCreate} wouldUpdate=${wouldUpdate} fieldWrites=${fieldWrites} reviewFields=${reviewFields} skippedExisting=${skippedExisting} skippedFlagged=${skippedFlagged} orphanGroups=${orphanGroups} orphanDrafts=${orphanDrafts} inactiveGroups=${inactiveGroups} inactiveDrafts=${inactiveDrafts} staleGroups=${staleGroups} staleFields=${staleFields}`);
  console.log("\nField writes by locale:");
  for (const [locale, count] of [...perLocale.entries()].sort()) console.log(`  ${locale}: ${count}`);
  if (skippedFlagged > 0 && !includeFlagged) {
    console.log(`\n${skippedFlagged} draft(s) skipped for validation issues. Re-run with --include-flagged to force-apply after human review.`);
  }

  // This gate is intentionally after the complete read-only preflight and
  // before the first mutation. A stale/inactive source anywhere aborts the
  // whole apply, so group iteration order can never cause a partial import.
  assertApplySafe({ dryRun, approveHumanReview, staleGroups, inactiveGroups, reviewFields });
  if (dryRun) return;

  await prisma.$transaction(async (tx) => {
    for (const item of planned) {
      if (item.existingRow) {
        await tx.blogTranslation.update({
          where: { postId_locale: { postId: item.group.postId, locale: item.group.targetLocale } },
          data: item.applied,
        });
      } else {
        const title = item.applied.title;
        if (!title) throw new Error(`Internal preflight error: create plan for ${item.group.postId}:${item.group.targetLocale} has no title`);
        await tx.blogTranslation.create({
          data: { ...item.applied, postId: item.group.postId, locale: item.group.targetLocale, slug: item.slug!, title },
        });
      }
    }
  });
  console.log(`\nAPPLIED ${fieldWrites} field(s) across ${planned.length} translation row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
