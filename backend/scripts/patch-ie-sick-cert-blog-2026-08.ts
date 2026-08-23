/**
 * OpenSEO + Claude-Blog refresh for the existing Ireland sick-cert article.
 *
 * Why update instead of creating a new URL:
 * - the existing slug already has search authority and first-party impressions;
 * - a second "sick cert online" article would compete with this page and the
 *   service landing page;
 * - the live article's designed CSS, doctor links and service CTA should be
 *   preserved while the stale text-baked cover is replaced in place.
 *
 * This script is dry-run by default. Applying is deliberately gated on a real
 * clinical review date because the article discusses certification, employer
 * requirements, backdating and urgent-care limits.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-blog-2026-08.ts
 *   node --env-file=.env --import tsx scripts/patch-ie-sick-cert-blog-2026-08.ts --apply --reviewed-at=YYYY-MM-DD --approved-sha256=<dry-run hash>
 *
 * Never pass --reviewed-at until the linked clinical reviewer has approved the
 * final copy. Deploy the frontend cover asset before applying. The command
 * preserves slug, locale, publication state, author, reviewer, service CTA,
 * cover asset ID and country visibility; it updates that asset's path and alt.
 */
import { prisma } from "../src/db/prisma.js";
import {
  SICK_CERT_BLOG_COPY,
  assertClinicalReviewGate,
  buildSickCertBlogBody,
  parseIsoReviewDate,
  sickCertApprovalSha256,
  validateSickCertBlogBody,
} from "../src/lib/ie-sick-cert-blog-content.js";
import { sanitizeBlogHtml } from "../src/utils/sanitize-html.js";

const APPLY = process.argv.includes("--apply");
const REVIEWED_AT_ARG = process.argv.find((arg) => arg.startsWith("--reviewed-at="));
const APPROVED_HASH_ARG = process.argv.find((arg) => arg.startsWith("--approved-sha256="));
const PUBLIC_SITE_ORIGIN = (process.env.PUBLIC_SITE_URL ?? "https://www.myglobalhealth.online").replace(/\/$/, "");

async function assertCoverIsLive(): Promise<void> {
  const coverUrl = new URL(SICK_CERT_BLOG_COPY.coverImagePath, PUBLIC_SITE_ORIGIN);
  const isLiveImage = (response: Response) =>
    response.ok && (response.headers.get("content-type") ?? "").toLowerCase().startsWith("image/");
  const headResponse = await fetch(coverUrl, { method: "HEAD", redirect: "follow" });
  if (isLiveImage(headResponse)) return;

  const getResponse = await fetch(coverUrl, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
    redirect: "follow",
  });
  await getResponse.body?.cancel();
  if (!isLiveImage(getResponse)) {
    throw new Error(`Refusing to apply: cover is not live as an image (${getResponse.status} ${coverUrl})`);
  }
}

async function main() {
  const reviewedAt = parseIsoReviewDate(REVIEWED_AT_ARG?.slice("--reviewed-at=".length));

  const post = await prisma.blogPost.findFirst({
    where: { slug: SICK_CERT_BLOG_COPY.slug, locale: "EN" },
    select: {
      id: true,
      slug: true,
      locale: true,
      status: true,
      isActive: true,
      title: true,
      body: true,
      authorDoctorId: true,
      reviewerDoctorId: true,
      authorDoctor: { select: { fullName: true } },
      reviewerDoctor: { select: { fullName: true } },
      ctaServiceId: true,
      coverAssetId: true,
      coverAsset: { select: { path: true, altText: true } },
      lastReviewedAt: true,
      translations: { select: { locale: true, slug: true, content: true } },
      countries: { select: { countryId: true } },
    },
  });
  if (!post) throw new Error(`BlogPost ${SICK_CERT_BLOG_COPY.slug} (EN) not found`);

  if (!post.authorDoctorId || !post.reviewerDoctorId) {
    throw new Error("Refusing to update: linked authorDoctorId and reviewerDoctorId are required");
  }
  if (post.authorDoctor?.fullName !== SICK_CERT_BLOG_COPY.authorName) {
    throw new Error(`Refusing to update: linked author is not ${SICK_CERT_BLOG_COPY.authorName}`);
  }
  if (post.reviewerDoctor?.fullName !== SICK_CERT_BLOG_COPY.reviewerName) {
    throw new Error(`Refusing to update: linked reviewer is not ${SICK_CERT_BLOG_COPY.reviewerName}`);
  }
  if (!post.ctaServiceId || !post.coverAssetId) {
    throw new Error("Refusing to update: the existing service CTA and cover asset must remain linked");
  }
  if (post.countries.length === 0) {
    throw new Error("Refusing to update: the post has no BlogPostCountry visibility rows");
  }

  const proposed = buildSickCertBlogBody(post.body);
  const sanitized = sanitizeBlogHtml(proposed);
  if (!sanitized) throw new Error("Sanitizer returned an empty blog body");
  const validationErrors = validateSickCertBlogBody(sanitized);
  if (validationErrors.length > 0) {
    throw new Error(`Sanitized article failed validation:\n- ${validationErrors.join("\n- ")}`);
  }
  const approvalHash = sickCertApprovalSha256(sanitized);
  const providedApprovalHash = APPROVED_HASH_ARG?.slice("--approved-sha256=".length);
  assertClinicalReviewGate(APPLY, reviewedAt, providedApprovalHash, approvalHash);

  const untouchedTranslations = post.translations.filter((translation) => translation.content);
  const mode = APPLY ? "APPLY" : "DRY RUN";
  console.log(`${mode}: ${post.slug}`);
  console.log(`  status: ${post.status}; active: ${post.isActive}`);
  console.log(`  title: ${post.title} -> ${SICK_CERT_BLOG_COPY.title}`);
  console.log(`  SEO title (${SICK_CERT_BLOG_COPY.seoTitle.length}): ${SICK_CERT_BLOG_COPY.seoTitle}`);
  console.log(`  meta (${SICK_CERT_BLOG_COPY.seoDescription.length}): ${SICK_CERT_BLOG_COPY.seoDescription}`);
  console.log(`  body: ${post.body.length} -> ${sanitized.length} characters`);
  console.log(`  cover: ${post.coverAsset?.path ?? "not set"} -> ${SICK_CERT_BLOG_COPY.coverImagePath}`);
  console.log(`  preserves author/reviewer/service/cover IDs: yes`);
  console.log(`  preserves ${post.countries.length} country visibility row(s): yes`);
  console.log(`  translated bodies left unchanged: ${untouchedTranslations.length}`);
  console.log(`  exact-copy approval sha256: ${approvalHash}`);
  console.log(`  last reviewed: ${post.lastReviewedAt?.toISOString() ?? "not set"} -> ${reviewedAt?.toISOString() ?? "awaiting clinical review"}`);

  if (!APPLY) {
    console.log("Dry run only. Obtain clinical approval for this exact hash, then re-run with --apply, the real review date and --approved-sha256.");
    return;
  }

  await assertCoverIsLive();

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: post.coverAssetId },
      data: {
        path: SICK_CERT_BLOG_COPY.coverImagePath,
        altText: SICK_CERT_BLOG_COPY.coverImageAlt,
      },
    }),
    prisma.blogPost.update({
      where: { id: post.id },
      data: {
        title: SICK_CERT_BLOG_COPY.title,
        excerpt: SICK_CERT_BLOG_COPY.excerpt,
        seoTitle: SICK_CERT_BLOG_COPY.seoTitle,
        seoDescription: SICK_CERT_BLOG_COPY.seoDescription,
        body: sanitized,
        lastReviewedAt: reviewedAt,
      },
    }),
  ]);
  console.log("Applied one clinically reviewed BlogPost and cover update. No translations or visibility rows changed.");
  console.log("The public blog detail cache may serve the prior version for up to 300 seconds; verify after that window or a frontend redeploy.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
