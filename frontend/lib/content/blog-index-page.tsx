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
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

type BlogIndexRouteParams = {
  /** Country slug from the route (e.g. "ireland"). Absent on the bare
   *  `/blog` route, which shows global posts only. */
  countrySlug?: string;
  /** Locale code from the route (e.g. "en"). Absent on the bare route. */
  lang?: string;
};

export async function renderBlogIndexPage({ countrySlug, lang }: BlogIndexRouteParams) {
  const countryCode = countrySlug ? countryCodeFromSlug(countrySlug) : null;
  const [ordered, cookieStore, locale] = await Promise.all([
    listBlogPosts(countryCode ?? undefined),
    cookies(),
    getPageLocale(),
  ]);
  const common = getCommonLocale(locale);
  const bp = common.blogPage;
  const { home } = loadLocaleBundle(locale);
  const blogI18n = home.blog;

  // "Back to home": inside a country context, go straight to that
  // country's home. On the bare index, fall back to the visitor's
  // remembered country (not the bare gateway "/" — it renders its own
  // country-picker logo lockup below the header, which reads as a
  // duplicate logo).
  let homeHref = "/";
  if (countrySlug && lang) {
    homeHref = `/${countrySlug}/${lang}`;
  } else {
    const lastCountryRaw = cookieStore.get("gh-last-country")?.value;
    const [lastSlug, lastLang] = lastCountryRaw?.split(":") ?? [];
    homeHref = lastSlug && lastLang ? `/${lastSlug}/${lastLang}` : "/";
  }

  const blogHref = countrySlug && lang ? `/${countrySlug}/${lang}/blog` : "/blog";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Blog", url: blogHref },
        ])}
      />
      <PageHero
        watermark={bp.heroWatermark ?? "Blog"}
        countryLabel={bp.heroCountryLabel ?? "Global Health · Blog"}
        titleLead={bp.heroTitleLead ?? "Health guides"}
        titleAccent={bp.heroTitleAccent ?? "articles."}
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 [&>*:first-child]:lg:col-span-2">
              {ordered.map((post) => {
                // Global posts (no countries assigned) are always canonical
                // at the bare URL, even inside a country index — the
                // country index legitimately mixes country-specific and
                // global posts (see blog.service.ts's OR filter), so this
                // must be decided per-post, not once for the whole page.
                const href =
                  post.countries.length > 0 && countrySlug && lang
                    ? `/${countrySlug}/${lang}/blog/${post.slug}`
                    : `/blog/${post.slug}`;
                return (
                  <BlogCard
                    key={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    href={href}
                    category={post.category}
                    publishedAt={post.publishedAt}
                    coverImageSrc={post.coverImageSrc}
                    coverImageAlt={post.coverImageAlt}
                    categoryFallback={bp.categoryFallback}
                    readArticleLabel={bp.readArticle}
                  />
                );
              })}
            </div>
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
