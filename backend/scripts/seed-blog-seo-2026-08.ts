/**
 * DRAFT — REQUIRES CLINICAL REVIEW BEFORE PUBLISHING
 *
 * SEO blog batch, August 2026: 2 articles per market (Ireland, Czechia,
 * Portugal, Spain, Romania, Brazil), each in every locale that market serves.
 *
 * Keyword targets and live evidence (OpenSEO / DataForSEO + Search Console,
 * pulled 2026-08-04 — each PostSet repeats its own numbers in its file header):
 *
 *   ie-illness-benefit        illness benefit ireland        6,600  KD 5
 *   ie-blood-tests            blood test dublin              1,600  KD 0
 *   cz-neschopenka            neschopenka                    2,400  KD 10
 *   cz-prakticky-lekar        praktický lékař online             —  KD 5
 *   pt-baixa-medica           baixa médica                   4,400  KD 0
 *   pt-consulta-viajante      consulta do viajante           5,400  KD 3
 *   es-baja-ansiedad          baja laboral por ansiedad      1,000  KD 0
 *   es-dermatologo-online     dermatólogo online               260  KD 0
 *   ro-scrisoare-medicala     scrisoare medicală             1,000  KD 0
 *   ro-boli-cronice           boli cronice                     880  KD 0
 *   br-atestado-medico        atestado médico online         1,600  KD 12
 *   br-pedido-exames          pedido de exames online          210  KD 0
 *
 * LOCALE MODEL — one post per market, one BlogTranslation per other locale.
 * `posts[0]` of each set is the market's own language and becomes the
 * BlogPost; every other locale is upserted as a BlogTranslation carrying its
 * own native slug, title, excerpt, SEO fields and body. That is the shape the
 * admin already edits and, since the 2026-08 read-path change, the shape the
 * public site serves: blog.service.ts selects translations and resolves a URL
 * by translation slug, blog-post-page.tsx renders the requested locale, and
 * sitemap.ts emits one URL per locale variant.
 *
 * An earlier revision of this script seeded each locale as its own BlogPost,
 * because the public renderer then read only BlogPost.locale. Those rows are
 * collapsed automatically on re-run: after writing a translation the script
 * deletes the standalone post that locale used to occupy — but only when it
 * is still DRAFT, was seeded by this script, and its body still matches the
 * stored hash. Anything a human has touched is reported and left alone.
 *
 * Per-locale seed hashes live in the parent post's editorialChecklist under
 * `seedHashes` (BlogTranslation has no JSON column), so an admin edit to one
 * translation makes the seeder skip that locale alone.
 *
 * SAFETY
 *  - Everything is seeded as DRAFT with publishedAt/lastReviewedAt null. The
 *    client publishes from the admin once a clinician has read the content.
 *  - Re-running never clobbers admin edits: each row stores a hash of the body
 *    it was seeded with, and a row whose current body no longer matches its
 *    stored hash is left completely alone.
 *  - Re-running never reverts status/publishedAt/lastReviewedAt.
 *  - ctaService and author/reviewer doctors are resolved by lookup and the run
 *    aborts if any is missing, rather than seeding a dangling FK.
 *  - Copy is validated (title/description budgets, word count, FAQ count,
 *    required internal links, the blocked-copy patterns that
 *    frontend/lib/content/publication-validation.ts refuses to publish) BEFORE
 *    anything is written. A validation failure aborts the whole run.
 *
 *   node --env-file=.env --import tsx scripts/seed-blog-seo-2026-08.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/seed-blog-seo-2026-08.ts --apply    # write
 *
 * .env points at PRODUCTION. Dry-run and read the diff first.
 */
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import { POST_SETS } from "./content/blog-seo-2026-08/index.js";
import type { LocalePost, PostSet } from "./content/blog-seo-2026-08/types.js";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);

const SEEDED_BY = "seed-blog-seo-2026-08";

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 155;
const WORDS_MIN = 1500;
const WORDS_MAX = 2500;
const FAQ_MIN = 4;
const FAQ_MAX = 6;

/** Same list frontend/lib/content/publication-validation.ts blocks. A seeded
 *  post that trips one of these can never be published from the admin. */
const BLOCKED = [
  /\bTODO\b/i, /\bplaceholder\b/i, /\bmigration\b/i, /\badapter\b/i,
  /\btemplate-driven\b/i, /\badmin-managed\b/i, /\bfuture-managed\b/i,
  /\bseeded\b/i, /\bfallback\b/i, /\bmock\b/i, /\bpending\b/i,
  /\blegacy compatibility\b/i,
];

const bodyHash = (body: string) => createHash("sha256").update(body).digest("hex");

const plain = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

type Prepared = {
  set: PostSet;
  post: LocalePost;
  body: string;
  hash: string;
  words: number;
};

function validate(set: PostSet, post: LocalePost, body: string, words: number): string[] {
  const errors: string[] = [];
  const id = `${set.key}/${post.locale}`;

  if (post.seoTitle.length > SEO_TITLE_MAX) errors.push(`${id}: seoTitle ${post.seoTitle.length} > ${SEO_TITLE_MAX} chars`);
  if (post.seoDescription.length > SEO_DESC_MAX) errors.push(`${id}: seoDescription ${post.seoDescription.length} > ${SEO_DESC_MAX} chars`);
  if (post.excerpt.trim().length < 30) errors.push(`${id}: excerpt shorter than the 30 chars publication-validation requires`);
  if (!post.category.trim()) errors.push(`${id}: category is empty`);
  if (words < WORDS_MIN || words > WORDS_MAX) errors.push(`${id}: ${words} words, outside ${WORDS_MIN}-${WORDS_MAX}`);

  const faqCount = post.article.faqs.length;
  if (faqCount < FAQ_MIN || faqCount > FAQ_MAX) errors.push(`${id}: ${faqCount} FAQs, outside ${FAQ_MIN}-${FAQ_MAX}`);
  // The exact shape frontend/lib/seo/article-faqs.ts matches for FAQPage schema.
  const rendered = (body.match(/<details class="faq-item">/g) ?? []).length;
  if (rendered !== faqCount) errors.push(`${id}: ${rendered} faq-item blocks rendered for ${faqCount} FAQs`);

  const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRe.test(post.slug)) errors.push(`${id}: slug "${post.slug}" is not lowercase-hyphen ASCII`);

  const text = plain(body);
  for (const pattern of BLOCKED) {
    if (pattern.test(text) || pattern.test(post.title) || pattern.test(post.excerpt) || pattern.test(post.seoTitle) || pattern.test(post.seoDescription)) {
      errors.push(`${id}: copy trips publication-validation blocked pattern ${pattern}`);
    }
  }

  // Every article has to link its market's service page, /doctors and /contact.
  const base = `myglobalhealth.online/`;
  for (const required of [`/services/${set.serviceSlug}`, "/doctors", "/contact"]) {
    if (!body.includes(`${base}`) || !body.includes(required)) errors.push(`${id}: missing required internal link ${required}`);
  }
  if (body.includes("/blog/categories/")) errors.push(`${id}: links to /blog/categories/, which is a live 404`);

  return errors;
}

async function main() {
  const sets = ONLY ? POST_SETS.filter((s) => s.key === ONLY || s.countryCode === ONLY) : POST_SETS;
  if (sets.length === 0) throw new Error(`--only=${ONLY} matched no post set.`);

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${sets.length} article(s), ${sets.reduce((n, s) => n + s.posts.length, 0)} locale row(s)\n`);

  // ---- resolve every FK up front; abort before writing anything ----
  const countries = new Map<string, string>();
  const services = new Map<string, string>();
  const doctors = new Map<string, string>();
  const errors: string[] = [];
  const prepared: Prepared[] = [];

  for (const set of sets) {
    const country = await prisma.country.findFirst({ where: { code: set.countryCode }, select: { id: true, name: true } });
    if (!country) { errors.push(`${set.key}: country "${set.countryCode}" not found`); continue; }
    countries.set(set.countryCode, country.id);

    const service = await prisma.service.findFirst({
      where: { countryId: country.id, slug: set.serviceSlug },
      select: { id: true, name: true, isActive: true },
    });
    if (!service) errors.push(`${set.key}: service "${set.serviceSlug}" not found in ${country.name}`);
    else {
      services.set(`${set.countryCode}:${set.serviceSlug}`, service.id);
      if (!service.isActive) errors.push(`${set.key}: service "${set.serviceSlug}" is inactive — the market does not currently sell it`);
    }

    for (const [role, id] of [["author", set.authorDoctorId], ["reviewer", set.reviewerDoctorId]] as const) {
      if (!id) continue;
      if (!doctors.has(id)) {
        const doctor = await prisma.doctor.findUnique({ where: { id }, select: { id: true, fullName: true, countryId: true } });
        if (!doctor) { errors.push(`${set.key}: ${role} doctor ${id} not found`); continue; }
        if (doctor.countryId !== country.id) errors.push(`${set.key}: ${role} doctor ${doctor.fullName} is not a ${country.name} doctor`);
        doctors.set(id, doctor.fullName);
      }
    }

    for (const post of set.posts) {
      const body = renderArticle(post.article);
      const words = wordCount(body);
      errors.push(...validate(set, post, body, words));
      prepared.push({ set, post, body, hash: bodyHash(body), words });
    }
  }

  const slugs = new Map<string, string>();
  for (const { set, post } of prepared) {
    const key = `${post.slug}|${post.locale}`;
    if (slugs.has(key)) errors.push(`duplicate slug+locale ${key} in ${slugs.get(key)} and ${set.key}`);
    else slugs.set(key, set.key);
  }

  // A URL now resolves by post slug OR translation slug (blog.service.ts), so
  // a slug that exists in both tables — on two DIFFERENT posts — would make
  // resolution arbitrary. Check the whole live slug space, not just this batch.
  {
    const batchSlugs = new Set(prepared.map((p) => p.post.slug));
    const setKeys = new Set(sets.map((s) => s.key));
    const live = await prisma.blogPost.findMany({
      select: { slug: true, editorialChecklist: true, translations: { select: { slug: true } } },
    });
    for (const row of live) {
      const checklist = (row.editorialChecklist ?? null) as { seededBy?: string; targetKeyword?: string } | null;
      // Rows this run is about to rewrite are not collisions with themselves.
      const isOurs = checklist?.seededBy === SEEDED_BY;
      for (const slug of [row.slug, ...row.translations.map((t) => t.slug)]) {
        if (!batchSlugs.has(slug)) continue;
        if (isOurs && setKeys.size > 0) continue;
        errors.push(`slug "${slug}" already exists on another post — URL resolution would be ambiguous`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`\nREFUSING TO RUN — ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exitCode = 1;
    return;
  }

  // ---- report + write ----
  let created = 0, updated = 0, skipped = 0, collapsed = 0;

  for (const set of sets) {
    const countryId = countries.get(set.countryCode)!;
    const serviceId = services.get(`${set.countryCode}:${set.serviceSlug}`)!;
    console.log(`\n=== ${set.key} — "${set.targetKeyword}" (vol ${set.searchVolume ?? "n/a"}, KD ${set.keywordDifficulty ?? "n/a"})`);
    console.log(`    CTA service: ${set.serviceSlug} · author: ${doctors.get(set.authorDoctorId)}${set.reviewerDoctorId ? ` · reviewer: ${doctors.get(set.reviewerDoctorId)}` : ""}`);

    const setItems = prepared.filter((x) => x.set.key === set.key);
    const primary = setItems[0];
    const secondary = setItems.slice(1);
    let postId: string | null = null;

    for (const item of [primary]) {
      const { post, body, hash, words } = item;
      const existing = await prisma.blogPost.findFirst({
        where: { slug: post.slug, locale: post.locale, countryId: null },
        select: { id: true, status: true, body: true, editorialChecklist: true },
      });

      const checklist = (existing?.editorialChecklist ?? null) as { seedHash?: string } | null;
      const editedInAdmin = Boolean(existing && checklist?.seedHash && checklist.seedHash !== bodyHash(existing.body));
      const action = !existing ? "create" : editedInAdmin ? "SKIP (edited in admin)" : "update";

      console.log(
        `    ${post.locale}  ${post.slug}\n` +
          `        ${action} · ${words} words · seoTitle ${post.seoTitle.length}/${SEO_TITLE_MAX} · seoDesc ${post.seoDescription.length}/${SEO_DESC_MAX} · ${post.article.faqs.length} FAQs` +
          (existing ? ` · existing status ${existing.status}` : ""),
      );

      if (!APPLY) continue;

      if (editedInAdmin) { skipped++; continue; }

      const editorialChecklist = {
        readyToIndex: false,
        clinicalReview: "required",
        seededBy: SEEDED_BY,
        seedHash: hash,
        targetKeyword: set.targetKeyword,
        searchVolume: set.searchVolume,
        keywordDifficulty: set.keywordDifficulty,
      };

      if (existing) {
        await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            title: post.title,
            excerpt: post.excerpt,
            body,
            category: post.category,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            authorDisplayName: set.authorDisplayName,
            authorDoctorId: set.authorDoctorId,
            reviewerDisplayName: set.reviewerDisplayName ?? null,
            reviewerDoctorId: set.reviewerDoctorId ?? null,
            ctaServiceId: serviceId,
            editorialChecklist,
            // status / publishedAt / lastReviewedAt are never touched on re-run:
            // a reviewer may already have moved this post forward.
          },
        });
        await prisma.blogPostCountry.upsert({
          where: { postId_countryId: { postId: existing.id, countryId } },
          create: { postId: existing.id, countryId },
          update: {},
        });
        updated++;
        postId = existing.id;
      } else {
      const row = await prisma.blogPost.create({
        data: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body,
          status: "DRAFT",
          locale: post.locale,
          category: post.category,
          authorDisplayName: set.authorDisplayName,
          authorDoctorId: set.authorDoctorId,
          reviewerDisplayName: set.reviewerDisplayName ?? null,
          reviewerDoctorId: set.reviewerDoctorId ?? null,
          ctaServiceId: serviceId,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          publishedAt: null,
          lastReviewedAt: null,
          editorialChecklist,
          isActive: true,
          countries: { create: { countryId } },
        },
        select: { id: true },
      });
      created++;
      postId = row.id;
      }
    }

    // ---- the market's other locales, as BlogTranslation rows ----
    //
    // Each locale keeps its own native slug, title, excerpt, SEO fields and
    // body, but they hang off the ONE post for this market rather than being
    // separate posts. That is the shape the admin already edits and the shape
    // the public renderer now reads (blog.service.ts publicBlogSelect).
    //
    // Per-locale seed hashes live in the parent post's editorialChecklist
    // (BlogTranslation has no JSON column), so an admin edit to one locale
    // makes the seeder skip that locale alone.
    for (const item of secondary) {
      console.log(
        `    ${item.post.locale}  ${item.post.slug}\n` +
          `        translation · ${item.words} words · seoTitle ${item.post.seoTitle.length}/${SEO_TITLE_MAX} · seoDesc ${item.post.seoDescription.length}/${SEO_DESC_MAX} · ${item.post.article.faqs.length} FAQs`,
      );
    }

    if (APPLY && postId) {
      const parent = await prisma.blogPost.findUnique({
        where: { id: postId },
        select: { editorialChecklist: true },
      });
      const parentChecklist = (parent?.editorialChecklist ?? {}) as Record<string, unknown>;
      const seedHashes = { ...((parentChecklist.seedHashes ?? {}) as Record<string, string>) };

      for (const item of secondary) {
        const { post, body, hash } = item;
        const existing = await prisma.blogTranslation.findUnique({
          where: { postId_locale: { postId, locale: post.locale } },
          select: { id: true, content: true },
        });
        const storedHash = seedHashes[post.locale];
        if (existing && storedHash && bodyHash(existing.content ?? "") !== storedHash) {
          console.log(`        ${post.locale} translation SKIPPED (edited in admin)`);
          skipped++;
          continue;
        }
        const data = {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: body,
          seoTitle: post.seoTitle,
          seoDesc: post.seoDescription,
        };
        await prisma.blogTranslation.upsert({
          where: { postId_locale: { postId, locale: post.locale } },
          create: { postId, locale: post.locale, ...data },
          update: data,
        });
        seedHashes[post.locale] = hash;
        if (existing) updated++; else created++;

        // Remove the standalone post this locale used to be seeded as, but
        // only when its body still matches what we wrote — a row a human has
        // touched is left alone and reported instead of being deleted.
        const legacy = await prisma.blogPost.findFirst({
          where: { slug: post.slug, locale: post.locale },
          select: { id: true, body: true, status: true, editorialChecklist: true },
        });
        if (legacy) {
          const legacyChecklist = (legacy.editorialChecklist ?? null) as { seedHash?: string; seededBy?: string } | null;
          const ours = legacyChecklist?.seededBy === SEEDED_BY;
          const untouched = Boolean(legacyChecklist?.seedHash && legacyChecklist.seedHash === bodyHash(legacy.body));
          if (ours && untouched && legacy.status === "DRAFT") {
            await prisma.blogPost.delete({ where: { id: legacy.id } });
            collapsed++;
          } else {
            console.log(
              `        ! standalone ${post.locale} post ${post.slug} left in place (${
                !ours ? "not seeded by this script" : legacy.status !== "DRAFT" ? `status ${legacy.status}` : "edited in admin"
              })`,
            );
          }
        }
      }

      await prisma.blogPost.update({
        where: { id: postId },
        data: { editorialChecklist: { ...parentChecklist, seedHashes } },
      });
    }
  }

  if (!APPLY) {
    console.log("\nDry run only — pass --apply to write.\n");
    return;
  }
  console.log(`\nDone. created ${created} · updated ${updated} · skipped ${skipped}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
