import Link from "next/link";
import { cookies } from "next/headers";
import { listBlogPosts } from "@/lib/content/get-public-blog";
import { BlogCard } from "@/components/cards/BlogCard";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Stethoscope, ShieldCheck, BookOpen } from "lucide-react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { CommonLocale } from "@/lib/i18n/types";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { sentenceCaseIfShouting } from "@/lib/text/sentence-case";
import { czechiaStaticPageSeo } from "@/lib/content/czechia-static-page-seo";

type BlogIndexRouteParams = {
  /** Country slug from the route (e.g. "ireland"). Absent on the bare
   *  `/blog` route, which shows global posts only. */
  countrySlug?: string;
  /** Locale code from the route (e.g. "en"). Absent on the bare route. */
  lang?: string;
  /** 1-based page from `?page=`. Out-of-range values clamp to a real page. */
  page?: number;
};

/** Cards per page. The index used to render every post in one grid, which
 *  does not survive a catalogue of one article per market per locale. */
const PAGE_SIZE = 12;

export async function renderBlogIndexPage({ countrySlug, lang, page }: BlogIndexRouteParams) {
  const countryCode = countrySlug ? countryCodeFromSlug(countrySlug) : null;
  // `lang` is passed as the explicit locale so a `[country]/[lang]/blog`
  // call resolves it from the URL segment already in hand instead of
  // reaching for cookies()/headers() — those are Next.js Dynamic APIs and
  // invoking them (even unused) forces the whole route to render dynamically,
  // defeating static generation on what should be a static country page.
  const [ordered, locale] = await Promise.all([
    // Ask for the route's locale so a post translated into it is listed with
    // its translated title, excerpt and slug rather than its original ones.
    listBlogPosts(countryCode ?? undefined, lang),
    getPageLocale(lang),
  ]);
  const common = getCommonLocale(locale);
  const bp = common.blogPage;
  const { home } = loadLocaleBundle(locale);
  const blogI18n = home.blog;
  const czechiaSeo = czechiaStaticPageSeo(countryCode, locale, "blog");

  // "Back to home": inside a country context, go straight to that
  // country's home. On the bare index, fall back to the visitor's
  // remembered country (not the bare gateway "/" — it renders its own
  // country-picker logo lockup below the header, which reads as a
  // duplicate logo). Only the bare (lang-less) route needs the cookie read.
  let homeHref = "/";
  let cookieCountrySlug: string | undefined;
  if (countrySlug && lang) {
    homeHref = `/${countrySlug}/${lang}`;
  } else {
    const cookieStore = await cookies();
    const lastCountryRaw = cookieStore.get("gh-last-country")?.value;
    const [lastSlug, lastLang] = lastCountryRaw?.split(":") ?? [];
    homeHref = lastSlug && lastLang ? `/${lastSlug}/${lastLang}` : "/";
    cookieCountrySlug = lastSlug || undefined;
  }

  const blogHref = countrySlug && lang ? `/${countrySlug}/${lang}/blog` : "/blog";

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page ?? 1), totalPages);
  const visible = ordered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // Path-based, not `?page=`: reading searchParams is a Dynamic API and would
  // opt this route out of static generation — the very thing the comment at
  // the top of this function exists to protect. `/blog/page/2` is a static
  // route segment, so every page stays prerenderable.
  const pageHref = (n: number) => (n <= 1 ? blogHref : `${blogHref}/page/${n}`);

  /* The bare hub lists every market at once, so it is grouped by country —
   * a reader arriving at /blog should see "Ireland", "Portugal", … and not a
   * single undifferentiated wall of cards. A country index is already scoped
   * to one market, so it renders one unlabelled group. A post assigned to
   * several countries is listed under the first of them by country code, so
   * it appears exactly once. */
  const groups: Array<{ key: string; label: string | null; posts: typeof visible }> = (() => {
    if (countrySlug) return [{ key: "all", label: null, posts: visible }];
    const byCountry = new Map<string, { label: string; posts: typeof visible }>();
    const global: typeof visible = [];
    for (const post of visible) {
      const primary = [...post.countries].sort((a, b) => a.code.localeCompare(b.code))[0];
      if (!primary) {
        global.push(post);
        continue;
      }
      const label = getCountryByCode(primary.code as CountryCode)?.name ?? primary.slug;
      const bucket = byCountry.get(primary.code) ?? { label, posts: [] };
      bucket.posts.push(post);
      byCountry.set(primary.code, bucket);
    }
    const out = [...byCountry.entries()]
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([code, v]) => ({ key: code, label: v.label, posts: v.posts }));
    if (global.length > 0) {
      out.push({ key: "global", label: bp.globalGroupLabel ?? "Global", posts: global });
    }
    return out;
  })();

  /* Every post has exactly ONE canonical URL: bare `/blog/{slug}` when global
   * (no countries assigned), `/{country}/{lang}/blog/{slug}` when
   * country-specific — the same rule resolveBlogPostRoute() enforces with a
   * redirect. Link straight at it so the bare index, which is in the main nav
   * and the sitemap, never points at a URL that immediately redirects.
   * Country choice mirrors resolveBlogPostRoute: the visitor's remembered
   * country when the post is published there, else lowest country code. */
  const blogPostHref = (post: { slug: string; locale: string; countries: Array<{ code: string; slug: string }> }) => {
    if (post.countries.length === 0) return `/blog/${post.slug}`;
    if (countrySlug && lang) return `/${countrySlug}/${lang}/blog/${post.slug}`;
    const target =
      post.countries.find((c) => c.slug === cookieCountrySlug) ??
      [...post.countries].sort((a, b) => a.code.localeCompare(b.code))[0];
    return `/${target.slug}/${post.locale.toLowerCase()}/blog/${post.slug}`;
  };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: common.navigation.home, url: "/" },
          { name: common.navigation.blog, url: blogHref },
        ])}
      />
      <PageHero
        watermark={bp.heroWatermark ?? "Blog"}
        countryLabel={bp.heroCountryLabel ?? "Global Health · Blog"}
        titleLead={czechiaSeo?.h1 ?? bp.heroTitleLead ?? "Health guides"}
        titleAccent={czechiaSeo ? "" : bp.heroTitleAccent ?? "articles."}
        lede={bp.heroLede ?? "Evidence-based guides written and reviewed by our medical team. No ads, no fluff."}
        ctaLabel={bp.heroCta ?? "Browse articles"}
        ctaHref="#articles"
        secondaryLabel={bp.heroSecondary ?? "Back to home"}
        secondaryHref={homeHref}
        rightSlot={<BlogArchPanel articleCount={ordered.length} i18n={bp} />}
        mobileBgSrc="/images/stock/blog.webp"
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: bp.doctorReviewedTitle,
            subtitle: bp.verifiedByClinicians,
          },
          {
            icon: <BookOpen className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: `${ordered.length} ${bp.articlePlural ?? "articles"}`,
            subtitle: bp.articlesAvailableNow,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: bp.evidenceBasedTitle,
            subtitle: bp.noAdsNoSponsors,
          },
        ]}
      />

      <section
        id="articles"
        className="relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
        style={{
          padding: "clamp(64px,8vw,120px) 0",
        }}
      >
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          {ordered.length === 0 ? (
            <div className="mx-auto max-w-[520px] text-center">
              <p aria-hidden className="gh2-index text-[4rem] leading-none text-[rgba(29,75,54,0.16)]">
                00
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {blogI18n.noArticles}
              </h2>
              <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                {blogI18n.checkBackSoon}
              </p>
              <Link href="/" className="mt-6 inline-flex rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
                {blogI18n.backToCountrySelection}
              </Link>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.key} className="mb-12 last:mb-0">
                  {/* The bare hub mixes every market, so it is grouped and
                      labelled by country. A country index is already scoped
                      to one market and gets no redundant heading. */}
                  {group.label ? (
                    <h2 className="mb-6 text-xl font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
                      {group.label}
                    </h2>
                  ) : null}
                  {/* Single column: every card is a long horizontal card. */}
                  <div className="grid gap-5 sm:gap-6">
                    {group.posts.map((post) => {
                      // Per-post, not once per page: a country index legitimately
                      // mixes country-specific and global posts (blog.service.ts's
                      // OR filter), and a global post stays canonical at the bare
                      // URL even when listed inside a country index.
                      const href = blogPostHref(post);
                      return (
                        <BlogCard
                          key={`${post.locale}:${post.slug}`}
                          title={sentenceCaseIfShouting(post.title)}
                          excerpt={post.excerpt}
                          href={href}
                          category={post.category}
                          publishedAt={post.publishedAt}
                          coverImageSrc={post.coverImageSrc}
                          coverImageAlt={post.coverImageAlt}
                          categoryFallback={bp.categoryFallback}
                          readArticleLabel={bp.readArticle}
                          locale={locale}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {totalPages > 1 ? (
                <nav
                  aria-label={bp.paginationLabel ?? "Pagination"}
                  className="mt-14 flex items-center justify-center gap-3"
                >
                  {currentPage > 1 ? (
                    <Link
                      href={pageHref(currentPage - 1)}
                      rel="prev"
                      className="rounded-full border border-[rgba(29,75,54,0.25)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]"
                    >
                      {bp.paginationPrevious ?? "Previous"}
                    </Link>
                  ) : null}
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link
                      href={pageHref(currentPage + 1)}
                      rel="next"
                      className="rounded-full border border-[rgba(29,75,54,0.25)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]"
                    >
                      {bp.paginationNext ?? "Next"}
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function BlogArchPanel({
  articleCount,
  i18n,
}: {
  articleCount: number;
  i18n: CommonLocale["blogPage"];
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/blog.webp"
        alt="Medical team reviewing health articles and educational content"
      />

      {/* Floating — Article count */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <BookOpen className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{articleCount} {articleCount === 1 ? (i18n.articleSingular ?? "article") : (i18n.articlePlural ?? "articles")}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{i18n.articlesAvailableNow}</span>
        </span>
      </div>

      {/* Floating — Doctor reviewed */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Stethoscope className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{i18n.doctorReviewedTitle}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{i18n.verifiedByClinicians}</span>
        </span>
      </div>

      {/* Floating — Evidence based */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-6 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <ShieldCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{i18n.evidenceBasedTitle}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{i18n.noAdsNoSponsors}</span>
        </span>
      </div>
    </div>
  );
}
