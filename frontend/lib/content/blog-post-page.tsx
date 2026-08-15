import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, User, Calendar, BadgeCheck, ArrowUpRight, RefreshCw } from "lucide-react";
import { BlogCard } from "@/components/cards/BlogCard";
import { getCountryByCode } from "@/data/countries";
import { getBlogPost, listBlogPosts, type BlogDoctor, type BlogListItem, type BlogPostFull } from "@/lib/content/get-public-blog";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { extractArticleFaqs } from "@/lib/seo/article-faqs";
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import type { LocaleCode } from "@/lib/i18n/types";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
import { fitHeadingFontSize } from "@/lib/text/fit-heading-size";
import { sentenceCaseIfShouting } from "@/lib/text/sentence-case";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";

type BlogPostRouteParams = {
  slug: string;
  /** Country slug from the route (e.g. "ireland"). Absent on the bare
   *  `/blog/[slug]` route. */
  countrySlug?: string;
  /** Locale code from the route (e.g. "en"). Absent on the bare route. */
  lang?: string;
};

/** Build a Physician schema input for a blog author/reviewer doctor, with the
 *  recognisedBy regulator resolved from the doctor's country trust data. */
async function blogPhysicianInput(doctor: BlogDoctor | null, locale: LocaleCode) {
  if (!doctor) return null;
  const trust = doctor.countryCode ? await getCountryTrust(doctor.countryCode, locale) : null;
  // Ranking-growth batch (2026-08-10): was hardcoded `/en/` regardless of the
  // ARTICLE's own locale, so a Portuguese post's Physician schema pointed at
  // an English-locale doctor URL. Use the article's resolved locale.
  const profileUrl =
    doctor.countrySlug ? `/${doctor.countrySlug}/${locale}/doctors/${doctor.slug}` : `/blog`;
  return {
    name: doctor.name,
    url: profileUrl,
    registrationNumber: doctor.registrationNumber,
    chamber: doctor.chamberEntity,
    regulator: trust?.regulator?.name
      ? { name: trust.regulator.name, url: trust.regulator.url }
      : null,
  };
}

type ResolvedBlogRoute =
  | { kind: "not-found" }
  /** `permanent` → 308 rather than 307. Set for the bare `/blog/{slug}` →
   *  country-canonical hop: that URL is never coming back as a content home. */
  | { kind: "redirect"; redirectTo: string; permanent?: boolean }
  | { kind: "render"; post: BlogPostFull; canonicalUrl: string; backHref: string };

/**
 * Resolve which post (if any) renders at this route, and where a visitor
 * should land instead if this isn't the post's canonical URL. Every post
 * has exactly one canonical URL: bare `/blog/{slug}` if global (no
 * countries assigned), or `/{country}/{lang}/blog/{slug}` if
 * country-specific — see the migration plan for the full reasoning.
 */
async function resolveBlogPostRoute(params: BlogPostRouteParams): Promise<ResolvedBlogRoute> {
  const { slug, countrySlug, lang } = params;
  const code = countrySlug ? countryCodeFromSlug(countrySlug) : null;

  if (countrySlug) {
    // Country-scoped route: fetch gated to (assigned-to-this-country OR
    // global), asking for the route's locale so a BlogTranslation is served
    // when one exists for it.
    const post = await getBlogPost(slug, code ?? undefined, lang);
    if (!post) return { kind: "not-found" };
    if (post.countries.length === 0) {
      // Actually global — bounce to its true canonical home instead of
      // letting the same content live at N country URLs.
      return { kind: "redirect", redirectTo: `/blog/${slug}` };
    }
    // Each locale is published under its own native slug. If this route was
    // reached by another locale's slug, the served content now belongs to a
    // different URL — send the visitor to it rather than serving one locale's
    // body at another locale's address.
    if (post.slug !== slug) {
      return { kind: "redirect", redirectTo: `/${countrySlug}/${lang}/blog/${post.slug}` };
    }
    return {
      kind: "render",
      post,
      canonicalUrl: `/${countrySlug}/${lang}/blog/${slug}`,
      backHref: `/${countrySlug}/${lang}/blog`,
    };
  }

  // Bare route: fetch unfiltered so we can see the country assignment
  // regardless of what it is, then decide whether to redirect.
  const post = await getBlogPost(slug);
  if (!post) return { kind: "not-found" };
  if (post.countries.length > 0) {
    const cookieStore = await cookies();
    const [cookieSlug] = (cookieStore.get("gh-last-country")?.value ?? "").split(":");
    const target =
      post.countries.find((c) => c.slug === cookieSlug) ??
      [...post.countries].sort((a, b) => a.code.localeCompare(b.code))[0];
    const targetLang = post.locale.toLowerCase();
    // `post.slug` — NOT the requested one. The backend resolved this post by a
    // slug that may belong to one of its translations, and returned that
    // locale's row; targeting `post.slug` under `post.locale` lands on the
    // country route's own canonical in ONE hop, instead of arriving at a URL
    // that route would immediately redirect again.
    return {
      kind: "redirect",
      redirectTo: `/${target.slug}/${targetLang}/blog/${post.slug}`,
      permanent: true,
    };
  }
  // `backHref` points at Ireland, not the bare `/blog`: that hub was retired on
  // 2026-08-15 and 301s here anyway (next.config.ts). The post itself keeps its
  // bare canonical — it has no country assignment, so no market owns it.
  return { kind: "render", post, canonicalUrl: `/blog/${slug}`, backHref: "/ireland/en/blog" };
}

export async function buildBlogPostMetadata(
  params: Promise<BlogPostRouteParams>,
): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveBlogPostRoute(routeParams);
  // Redirect from generateMetadata, not only from the page body. `redirect()`
  // thrown inside the page is raised BEHIND the route's Suspense boundary
  // (`loading.tsx`), by which point the 200 and the <head> have already been
  // flushed — the response Google saw was a 200 shell titled "Global Health",
  // with no article body and a canonical pointing at the homepage, because this
  // function used to answer `{}` (root metadata) for exactly this case.
  // generateMetadata runs before anything is flushed, so the redirect is a real
  // HTTP one.
  if (resolved.kind === "redirect") {
    if (resolved.permanent) permanentRedirect(resolved.redirectTo);
    redirect(resolved.redirectTo);
  }
  if (resolved.kind !== "render") return {};
  const { post, canonicalUrl } = resolved;
  const countryCode = post.countries.find(
    (country) => country.slug === routeParams.countrySlug,
  )?.code;
  const config = countryCode ? getCountryByCode(countryCode) : null;
  const language = (routeParams.lang ?? post.locale).toLowerCase();
  const nativeRegion: Record<string, string> = {
    en: "GB",
    pt: "PT",
    es: "ES",
    cs: "CZ",
    ro: "RO",
    de: "DE",
  };
  // A post is served in the route's locale when it was authored in it OR has
  // a BlogTranslation for it — `post.locale` is the locale actually served,
  // so comparing it to the route language answers both cases. A locale with
  // no content of its own still falls back to the post's own language body;
  // that variant is canonicalized to the real-content URL and noindexed
  // rather than self-canonicalizing a duplicate. Bare `/blog/[slug]` has no
  // route lang, so it is always "its own" URL.
  const postLanguage = post.locale.toLowerCase();
  const isTranslatedVariant = !routeParams.countrySlug || !routeParams.lang || language === postLanguage;
  const metadataPath = isTranslatedVariant
    ? canonicalUrl
    : `/${routeParams.countrySlug}/${postLanguage}/blog/${post.slug}`;
  const displayTitle = sentenceCaseIfShouting(post.title);
  return buildPublicMetadata({
    path: metadataPath,
    title: sentenceCaseIfShouting(post.seoTitle ?? post.title),
    description: post.seoDescription ?? post.excerpt,
    type: "article",
    kind: "article",
    subtitle: post.category,
    sourceImage: post.coverImageSrc ?? undefined,
    imageAlt: post.coverImageAlt ?? displayTitle,
    locale: config
      ? ogLocales(config, language).locale
      : `${language}_${nativeRegion[language] ?? language.toUpperCase()}`,
    // Each locale is published under its OWN native slug, so a single-suffix
    // hreflang map would advertise every language at one slug and point most
    // of them at a redirect. Build the map from the post's actual locale
    // variants instead, falling back to the served slug for locales that have
    // no content of their own (those pages are noindexed anyway).
    languages: config ? blogHreflangAlternates(config, post) : undefined,
    noindex: !isTranslatedVariant,
  });
}

/** Per-locale hreflang for a blog post: `{lang}-{REGION}` → the URL that
 *  language is actually published at. */
function blogHreflangAlternates(
  config: NonNullable<ReturnType<typeof getCountryByCode>>,
  post: BlogPostFull,
): Record<string, string> {
  const slugFor = new Map(post.localeVariants.map((v) => [v.locale.toUpperCase(), v.slug]));
  const base = hreflangAlternates(config, `/blog/${post.slug}`);
  const out: Record<string, string> = {};
  const defaultLang = (config.defaultLocale ?? "en").toUpperCase();
  for (const [key, path] of Object.entries(base)) {
    // Keys are `{lang}-{REGION}` plus `x-default`, which names the default
    // locale's URL rather than a language of its own.
    const lang = key === "x-default" ? defaultLang : key.split("-")[0]?.toUpperCase() ?? "";
    const slug = slugFor.get(lang);
    out[key] = slug ? path.replace(`/blog/${post.slug}`, `/blog/${slug}`) : path;
  }
  return out;
}

export async function renderBlogPostPage(params: Promise<BlogPostRouteParams>) {
  const routeParams = await params;
  const resolved = await resolveBlogPostRoute(routeParams);
  if (resolved.kind === "not-found") notFound();
  if (resolved.kind === "redirect") {
    if (resolved.permanent) permanentRedirect(resolved.redirectTo);
    redirect(resolved.redirectTo);
  }
  const { post, canonicalUrl, backHref } = resolved;
  const routeCode = routeParams.countrySlug ? countryCodeFromSlug(routeParams.countrySlug) : undefined;
  const displayTitle = sentenceCaseIfShouting(post.title);

  const locale = await getPageLocale(post.locale);
  const { home } = loadLocaleBundle(locale);
  const blogI18n = home.blog;
  // "Read article" lives on common.blogPage, not home.blog — the related-card
  // grid shares the blog index's card, so it needs the index's label bundle.
  const blogPageI18n = getCommonLocale(locale).blogPage;
  const commonNav = getCommonLocale(locale).navigation;

  // Ranking-growth batch (2026-08-10): was hardcoded `/en/` regardless of the
  // article's own locale — a PT/ES/CS/RO article's CTA sent readers to an
  // English-locale service page. Use the article's resolved locale.
  const ctaHref = post.ctaService
    ? `/${post.ctaService.countrySlug}/${locale}/services/${post.ctaService.slug}`
    : "/";

  const formatted = new Date(post.publishedAt).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [authorPhysician, reviewerPhysician, relatedPosts] = await Promise.all([
    blogPhysicianInput(post.authorDoctor, locale),
    blogPhysicianInput(post.reviewerDoctor, locale),
    listBlogPosts(routeCode ?? undefined).then((posts) =>
      posts.filter((p) => p.slug !== post.slug).slice(0, 3),
    ),
  ]);

  // Byline — prefer the linked author doctor (with a profile link), fall back
  // to the free-text author ("Global Health Editorial Team" when unset). Same
  // preference the Article JSON-LD uses, so the visible byline and the schema
  // can't name different people.
  const authorName = post.authorDoctor?.name ?? post.author;
  const authorHref = post.authorDoctor?.countrySlug
    ? `/${post.authorDoctor.countrySlug}/en/doctors/${post.authorDoctor.slug}`
    : null;
  // "Clinically reviewed by Dr X" — prefer the linked reviewer doctor (with
  // a profile link), fall back to the free-text reviewer name.
  const reviewerName = post.reviewerDoctor?.name ?? post.reviewer;
  const reviewerHref =
    post.reviewerDoctor?.countrySlug
      ? `/${post.reviewerDoctor.countrySlug}/en/doctors/${post.reviewerDoctor.slug}`
      : null;
  const lastReviewedFormatted = post.lastReviewedAt
    ? new Date(post.lastReviewedAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : formatted;
  // Designed articles render their FAQs as visible <details> blocks; mirror
  // them into FAQPage schema. Never fabricated — if the body has no FAQ
  // markup, no FAQPage node is emitted.
  const articleFaqs = extractArticleFaqs(post.body);
  /** Body ships its own complete design (its own <style> block). */
  const isDesignedBody = post.body.includes("<style");
  /** Body closes with its own styled medical-disclaimer panel. */
  const bodyHasOwnDisclaimer = /class="[^"]*\bdisclaimer\b/.test(post.body);
  const relatedHrefFor = (p: BlogListItem) =>
    routeParams.countrySlug && routeParams.lang
      ? `/${routeParams.countrySlug}/${routeParams.lang}/blog/${p.slug}`
      : `/blog/${p.slug}`;

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: displayTitle,
            description: post.seoDescription ?? post.excerpt,
            url: `${getSiteUrl()}${canonicalUrl}`,
            datePublished: post.publishedAt,
            dateModified: post.lastReviewedAt,
            imageSrc: post.coverImageSrc,
            authorName,
            authorPhysician,
            // `reviewedBy`: the distinct clinical reviewer if one is linked,
            // otherwise the author physician stands as their own reviewer —
            // both are the SAME real, credentialed Physician entity already
            // rendered elsewhere on the page, never a fabricated reviewer.
            reviewerPhysician: reviewerPhysician ?? authorPhysician,
            about: post.category,
          }),
          breadcrumbJsonLd([
            { name: commonNav.home, url: "/" },
            { name: commonNav.blog, url: backHref },
            { name: displayTitle, url: canonicalUrl },
          ]),
          ...(articleFaqs.length > 0 ? [faqJsonLd(articleFaqs)] : []),
        ]}
      />
      {/* ── Article hero — matches the PageHero atmosphere (layered forest
          gradients, lime glow, plus glyphs) with the cover image living IN the
          hero as a right-column panel instead of a detached banner below. */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate flex flex-col !overflow-visible gh-hero-cap lg:min-h-[calc(100svh-var(--header-height))]"
        style={{ background: "#031F18" }}
      >
        {/* Mobile/tablet — cover photo as the full-bleed backdrop behind the
            text, same treatment as ServiceHero (desktop uses the left column). */}
        {post.coverImageSrc ? (
          <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 lg:hidden">
            <Image
              src={post.coverImageSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              unoptimized={isUnoptimizedImageSrc(post.coverImageSrc)}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(3,31,24,0.72) 0%, rgba(3,31,24,0.86) 45%, rgba(3,31,24,0.97) 100%)",
              }}
            />
          </div>
        ) : null}

        <div
          className={`relative lg:min-h-0 lg:flex-1 ${post.coverImageSrc ? "grid lg:grid-cols-2" : "flex"}`}
        >
          {/* ── LEFT — full-bleed cover panel (desktop only) ─────────────── */}
          {post.coverImageSrc ? (
            <div
              className="relative hidden overflow-hidden lg:block"
              style={{ minHeight: "clamp(300px, 46vw, 900px)" }}
            >
              {/* Blurred fill so the column reads full-bleed, while the poster
                  itself stays uncropped on top (blog covers carry baked-in
                  text — object-cover would slice it off at this aspect). */}
              <Image
                src={post.coverImageSrc}
                alt=""
                aria-hidden
                fill
                sizes="50vw"
                className="scale-110 object-cover object-center blur-2xl"
                style={{ opacity: 0.45 }}
                unoptimized={isUnoptimizedImageSrc(post.coverImageSrc)}
              />
              <Image
                src={post.coverImageSrc}
                alt={post.coverImageAlt ?? displayTitle}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain object-center p-8 xl:p-12"
                unoptimized={isUnoptimizedImageSrc(post.coverImageSrc)}
              />
              {/* Brand green wash */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(3,31,24,0.28) 0%, rgba(3,31,24,0.08) 30%, rgba(3,31,24,0.50) 100%)",
                }}
              />
              {/* Right-edge bleed into the content column */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0"
                style={{
                  width: "40%",
                  background:
                    "linear-gradient(to right, rgba(3,31,24,0) 0%, rgba(3,31,24,0.78) 68%, #031F18 100%)",
                }}
              />
            </div>
          ) : null}

          {/* ── RIGHT — article meta over the layered premium background ─── */}
          <div className="relative isolate flex w-full flex-col justify-center bg-transparent px-8 py-12 md:px-12 lg:bg-[#031F18] lg:px-16 lg:py-10">
            {/* gradient depth + vignette — desktop only */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
              style={{
                background:
                  "radial-gradient(circle at 90% 12%, rgba(22,89,64,0.32), transparent 40%)," +
                  "radial-gradient(circle at 14% 88%, rgba(2,18,13,0.55), transparent 46%)," +
                  "linear-gradient(135deg, #062b21 0%, #031F18 46%, #02140e 100%)",
              }}
            />
            {/* technical grid — desktop only */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(176,241,34,0.05) 1px, transparent 1px)," +
                  "linear-gradient(90deg, rgba(176,241,34,0.05) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage:
                  "radial-gradient(120% 120% at 80% 20%, #000 0%, rgba(0,0,0,0.45) 55%, transparent 90%)",
                WebkitMaskImage:
                  "radial-gradient(120% 120% at 80% 20%, #000 0%, rgba(0,0,0,0.45) 55%, transparent 90%)",
              }}
            />
            {/* dotted texture — desktop only */}
            <div
              aria-hidden
              className="gh-dot-grid pointer-events-none absolute inset-0 z-0 hidden lg:block"
              style={{
                opacity: 0.6,
                maskImage: "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
              }}
            />
            {/* soft radial glow behind content */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(circle at 38% 40%, rgba(176,241,34,0.10), transparent 30%)," +
                  "radial-gradient(circle at 72% 72%, rgba(18,120,76,0.22), transparent 38%)," +
                  "radial-gradient(ellipse 620px 520px at 112% -8%, rgba(176,241,34,0.12), transparent 62%)",
              }}
            />
            {/* faint medical plus symbols — desktop-only watermark glyphs */}
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block"
              style={{ top: "-2%", right: "6%", fontSize: "180px", color: "rgba(176,241,34,0.06)" }}
            >
              +
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block"
              style={{ bottom: "10%", right: "12%", fontSize: "72px", color: "rgba(176,241,34,0.05)" }}
            >
              +
            </span>

            <div className="relative z-10" style={{ maxWidth: 640 }}>
              <Link
                href={backHref}
                className="gh-focus-on-dark mb-7 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-[var(--color-brand-accent)]"
              >
                <ArrowUpRight className="size-3.5 -rotate-[135deg]" aria-hidden />
                {blogI18n.allArticles}
              </Link>

              {/* Category pill */}
              <p>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    background: "rgba(176,241,34,0.09)",
                    border: "1px solid rgba(176,241,34,0.22)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--color-brand-accent)" }} />
                  {post.category}
                </span>
              </p>

              <h1
                className="mt-6 font-extrabold tracking-[-0.035em]"
                style={{
                  // Blog titles run far longer than service-hero titles, so the
                  // fitter is tuned to a 60-char budget instead of ~22.
                  fontSize: fitHeadingFontSize(displayTitle, {
                    minRem: 2.4,
                    maxRem: 4.2,
                    viewportTerm: "2.2vw + 1.7rem",
                    idealChars: 60,
                    svhCap: 13,
                  }),
                  lineHeight: 1.04,
                  color: "#F5FFF8",
                  maxWidth: "20ch",
                }}
              >
                {displayTitle}
              </h1>

              {post.excerpt ? (
                <p
                  className="mt-5 max-w-[52ch] leading-relaxed"
                  style={{ fontSize: "var(--text-body-lg)", color: "rgba(255,255,255,0.62)" }}
                >
                  {post.excerpt}
                </p>
              ) : null}

              {/* Meta — glass chips. The "last reviewed" chip is the single
                  visible freshness indicator; it reads from post.lastReviewedAt,
                  the exact same field that feeds the JSON-LD Article.dateModified
                  below, so the two can never drift apart. Only shown once the
                  post has actually been revised past its publish date — avoids
                  a redundant "Published X / Updated X" chip pair on day one. */}
              <div className="mt-7 flex flex-wrap items-center gap-2.5 text-[13px] font-medium">
                <span
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.11)",
                    color: "rgba(255,255,255,0.72)",
                  }}
                >
                  <User className="size-3.5" aria-hidden />
                  {authorHref ? (
                    <Link
                      href={authorHref}
                      className="gh-focus-on-dark underline decoration-[rgba(255,255,255,0.35)] underline-offset-2 transition-colors hover:text-[var(--color-brand-accent)]"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    authorName
                  )}
                </span>
                {[
                  { icon: <Calendar className="size-3.5" aria-hidden />, label: formatted },
                  { icon: <Clock className="size-3.5" aria-hidden />, label: `${post.readingTime} ${blogI18n.minRead}` },
                  ...(post.lastReviewedAt && lastReviewedFormatted !== formatted
                    ? [{
                        icon: <RefreshCw className="size-3.5" aria-hidden />,
                        label: `${blogI18n.lastReviewed} ${lastReviewedFormatted}`,
                      }]
                    : []),
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.11)",
                      color: "rgba(255,255,255,0.72)",
                    }}
                  >
                    {chip.icon}
                    {chip.label}
                  </span>
                ))}
                {reviewerName ? (
                  <span
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5"
                    style={{
                      background: "rgba(176,241,34,0.08)",
                      border: "1px solid rgba(176,241,34,0.20)",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    <BadgeCheck className="size-3.5 text-[var(--color-brand-accent)]" aria-hidden />
                    {blogI18n.clinicallyReviewedBy}{" "}
                    {reviewerHref ? (
                      <Link
                        href={reviewerHref}
                        className="gh-focus-on-dark underline decoration-[rgba(176,241,34,0.5)] underline-offset-2 transition-colors hover:text-[var(--color-brand-accent)]"
                      >
                        {reviewerName}
                      </Link>
                    ) : (
                      reviewerName
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article body. Designed articles (they ship their own <style>) are
          full-bleed — their CSS sizes sections against 100vw, so any site
          container/padding here squeezes their grid columns. Plain rich-text
          bodies keep the site container + padding. */}
      <section
        className={isDesignedBody ? undefined : "mx-auto max-w-[var(--container-width)]"}
        style={
          isDesignedBody
            ? { background: "var(--color-background-page)" }
            : { background: "var(--color-background-page)", padding: "clamp(48px,6vw,80px) clamp(20px,4vw,40px)" }
        }
      >
        {/* Admin-authored article HTML. Sanitized on save (scripts stripped,
            <style>/classes preserved) and CSS-scoped to .gh-article-body so it
            can't bleed into the site. Rendered server-side for SEO. */}
        <div
          className="gh-article-body gh-article-raw"
          // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- scopeBlogHtml() runs sanitize-html with a controlled allowlist (frontend/lib/content/scope-blog-html.ts) before this renders; mirrors the backend's own sanitizeBlogHtml allowlist.
          dangerouslySetInnerHTML={{ __html: scopeBlogHtml(post.body) }}
        />
        {/* Designed articles nearly all close with their own styled
            "Medical Disclaimer" panel; appending this one under it printed the
            same notice twice (naming a different doctor, since this line reads
            the linked reviewer and the body names the author). Only render it
            when the body has no disclaimer of its own. The wrapper carries the
            side padding — the designed-body section above is deliberately
            unpadded, which left this paragraph flush to both screen edges. */}
        {reviewerName && !bodyHasOwnDisclaimer ? (
          <div className="mx-auto max-w-[var(--container-width)] px-5 pb-2 md:px-10">
            <p className="mx-auto mt-8 max-w-[76ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {blogI18n.clinicallyReviewedBy} {reviewerName}. {blogI18n.lastReviewed} {lastReviewedFormatted}.{" "}
              {blogI18n.medicalDisclaimer}
            </p>
          </div>
        ) : null}
      </section>

      {/* Dark CTA block — matches luxury language of the rest of the site */}
      <section
        className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
        style={{
          padding: "clamp(64px,8vw,100px) 0",
        }}
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {blogI18n.nextStep}
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                style={{
                  fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {blogI18n.readyToSpeak}
              </h2>
              <p
                className="mt-5 max-w-[48ch] text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {/* Blog articles live outside the [country]/[lang] segment. When
                  * the post has a linked CTA service, we route straight to that
                  * service's page; otherwise fall back to the root country gate
                  * (CountryEntryGate at /) which negotiates the right country +
                  * locale for the reader. */}
                {blogI18n.bookConsultationBody}
              </p>
            </div>
            <Link
              href={ctaHref}
              className="gh2-btn-lime lg:justify-self-end"
            >
              {blogI18n.bookConsultation}
            </Link>
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 ? (
        <section className="gh-inline-clamp-section relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <h2
              className="max-w-[24ch] font-extrabold tracking-[-0.03em] leading-[1.04]"
              style={{
                fontSize: "clamp(1.9rem,3.5vw + 0.4rem,3rem)",
                color: "var(--color-text-primary)",
              }}
            >
              {blogI18n.moreArticles}
            </h2>
            {/* Same card as the blog index, in its stacked orientation — the
                cover image is already on BlogListItem, so the old text-only
                tile was dropping an asset the data layer had all along. */}
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
              {relatedPosts.map((p) => (
                <BlogCard
                  key={p.slug}
                  orientation="stacked"
                  headingLevel="h3"
                  locale={locale}
                  title={sentenceCaseIfShouting(p.title)}
                  excerpt={p.excerpt}
                  href={relatedHrefFor(p)}
                  category={p.category}
                  publishedAt={p.publishedAt}
                  coverImageSrc={p.coverImageSrc}
                  coverImageAlt={p.coverImageAlt}
                  readingTimeLabel={`${p.readingTime} ${blogI18n.minRead}`}
                  readArticleLabel={blogPageI18n.readArticle}
                  categoryFallback={blogPageI18n.categoryFallback}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
