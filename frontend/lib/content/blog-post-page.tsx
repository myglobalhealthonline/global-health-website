import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, User, Calendar, BadgeCheck, ArrowUpRight, RefreshCw } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getBlogPost, listBlogPosts, type BlogDoctor, type BlogListItem, type BlogPostFull } from "@/lib/content/get-public-blog";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
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
async function blogPhysicianInput(doctor: BlogDoctor | null) {
  if (!doctor) return null;
  const trust = doctor.countryCode ? await getCountryTrust(doctor.countryCode) : null;
  const profileUrl =
    doctor.countrySlug ? `/${doctor.countrySlug}/en/doctors/${doctor.slug}` : `/blog`;
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
  | { kind: "redirect"; redirectTo: string }
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
    // Country-scoped route: fetch gated to (assigned-to-this-country OR global).
    const post = await getBlogPost(slug, code ?? undefined);
    if (!post) return { kind: "not-found" };
    if (post.countries.length === 0) {
      // Actually global — bounce to its true canonical home instead of
      // letting the same content live at N country URLs.
      return { kind: "redirect", redirectTo: `/blog/${slug}` };
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
    return { kind: "redirect", redirectTo: `/${target.slug}/${targetLang}/blog/${slug}` };
  }
  return { kind: "render", post, canonicalUrl: `/blog/${slug}`, backHref: "/blog" };
}

export async function buildBlogPostMetadata(
  params: Promise<BlogPostRouteParams>,
): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveBlogPostRoute(routeParams);
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
  // Blog posts have exactly one authored locale (post.locale) — there's no
  // per-locale translation row like the CMS content-page/doctor tables. A
  // country-scoped visitor hitting a locale that ISN'T the post's own locale
  // (e.g. .../pt/blog/x when the post was written in EN) is served the same
  // English body verbatim: canonicalize to the post's real-content URL and
  // noindex the untranslated variant instead of self-canonicalizing a
  // duplicate. Bare `/blog/[slug]` has no route lang, so it's always "its
  // own" URL.
  const postLanguage = post.locale.toLowerCase();
  const isTranslatedVariant = !routeParams.countrySlug || !routeParams.lang || language === postLanguage;
  const metadataPath = isTranslatedVariant
    ? canonicalUrl
    : `/${routeParams.countrySlug}/${postLanguage}/blog/${post.slug}`;
  return buildPublicMetadata({
    path: metadataPath,
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    type: "article",
    kind: "article",
    subtitle: post.category,
    sourceImage: post.coverImageSrc ?? undefined,
    imageAlt: post.coverImageAlt ?? post.title,
    locale: config
      ? ogLocales(config, language).locale
      : `${language}_${nativeRegion[language] ?? language.toUpperCase()}`,
    languages: config ? hreflangAlternates(config, `/blog/${post.slug}`) : undefined,
    noindex: !isTranslatedVariant,
  });
}

export async function renderBlogPostPage(params: Promise<BlogPostRouteParams>) {
  const routeParams = await params;
  const resolved = await resolveBlogPostRoute(routeParams);
  if (resolved.kind === "not-found") notFound();
  if (resolved.kind === "redirect") redirect(resolved.redirectTo);
  const { post, canonicalUrl, backHref } = resolved;
  const routeCode = routeParams.countrySlug ? countryCodeFromSlug(routeParams.countrySlug) : undefined;

  const locale = await getPageLocale(post.locale);
  const { home } = loadLocaleBundle(locale);
  const blogI18n = home.blog;

  const ctaHref = post.ctaService
    ? `/${post.ctaService.countrySlug}/en/services/${post.ctaService.slug}`
    : "/";

  const formatted = new Date(post.publishedAt).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [authorPhysician, reviewerPhysician, relatedPosts] = await Promise.all([
    blogPhysicianInput(post.authorDoctor),
    blogPhysicianInput(post.reviewerDoctor),
    listBlogPosts(routeCode ?? undefined).then((posts) =>
      posts.filter((p) => p.slug !== post.slug).slice(0, 3),
    ),
  ]);

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
  const relatedHrefFor = (p: BlogListItem) =>
    routeParams.countrySlug && routeParams.lang
      ? `/${routeParams.countrySlug}/${routeParams.lang}/blog/${p.slug}`
      : `/blog/${p.slug}`;

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: post.title,
            description: post.seoDescription ?? post.excerpt,
            url: `${getSiteUrl()}${canonicalUrl}`,
            datePublished: post.publishedAt,
            dateModified: post.lastReviewedAt,
            imageSrc: post.coverImageSrc,
            authorName: post.author,
            authorPhysician,
            // `reviewedBy`: the distinct clinical reviewer if one is linked,
            // otherwise the author physician stands as their own reviewer —
            // both are the SAME real, credentialed Physician entity already
            // rendered elsewhere on the page, never a fabricated reviewer.
            reviewerPhysician: reviewerPhysician ?? authorPhysician,
            about: post.category,
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: backHref },
            { name: post.title, url: canonicalUrl },
          ]),
        ]}
      />
      {/* ── Article hero — matches the PageHero atmosphere (layered forest
          gradients, lime glow, plus glyphs) with the cover image living IN the
          hero as a right-column panel instead of a detached banner below. */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#0F2E25" }}
      >
        {/* Depth base + vignette */}
        <div
          aria-hidden
          className="gh-medical-pattern-layer pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(circle at 88% 14%, rgba(22,89,64,0.34), transparent 42%)," +
              "radial-gradient(circle at 12% 90%, rgba(3,26,20,0.55), transparent 46%)," +
              "linear-gradient(135deg, #0a2a20 0%, #0F2E25 48%, #06201a 100%)",
          }}
        />
        {/* Lime glow behind the headline */}
        <div
          aria-hidden
          className="gh-medical-pattern-layer pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(circle at 30% 38%, rgba(176,241,34,0.09), transparent 32%)," +
              "radial-gradient(ellipse 620px 480px at 108% -6%, rgba(176,241,34,0.10), transparent 62%)",
          }}
        />
        {/* Plus glyph watermarks — desktop only */}
        <span aria-hidden className="gh-medical-pattern-layer pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block" style={{ top: "-4%", right: "40%", fontSize: 160, color: "rgba(176,241,34,0.05)" }}>+</span>
        <span aria-hidden className="gh-medical-pattern-layer pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block" style={{ bottom: "10%", left: "44%", fontSize: 84, color: "rgba(176,241,34,0.045)" }}>+</span>

        <div
          className="relative z-10 mx-auto max-w-[var(--container-width)] px-5 md:px-10"
          style={{ paddingTop: "clamp(48px,6vw,80px)", paddingBottom: "clamp(48px,6vw,80px)" }}
        >
          <div className={post.coverImageSrc ? "grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14" : ""}>
            <div>
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
                className="mt-6 font-extrabold leading-[1.02] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2.1rem,3.4vw + 0.9rem,3.8rem)", color: "rgba(255,255,255,0.96)", maxWidth: "18ch" }}
              >
                {post.title}
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
                {[
                  { icon: <User className="size-3.5" aria-hidden />, label: post.author },
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

            {/* Cover image — in-hero panel (desktop right column; stacks below
                content on mobile) */}
            {post.coverImageSrc ? (
              <div
                className="relative mt-2 overflow-hidden rounded-[var(--radius-card)] lg:mt-0"
                style={{
                  aspectRatio: "16 / 9",
                  maxHeight: 440,
                  background: "rgba(4,32,24,0.85)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 24px 60px -24px rgba(0,0,0,0.55), 0 0 0 1px rgba(176,241,34,0.06)",
                }}
              >
                <Image
                  src={post.coverImageSrc}
                  alt={post.coverImageAlt ?? post.title}
                  fill
                  priority
                  sizes="(min-width:1024px) 46vw, 100vw"
                  className="object-contain"
                  unoptimized={isUnoptimizedImageSrc(post.coverImageSrc)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Article body. Designed articles (they ship their own <style>) are
          full-bleed — their CSS sizes sections against 100vw, so any site
          container/padding here squeezes their grid columns. Plain rich-text
          bodies keep the site container + padding. */}
      <section
        className={post.body.includes("<style") ? undefined : "mx-auto max-w-[var(--container-width)]"}
        style={
          post.body.includes("<style")
            ? { background: "var(--color-background-page)" }
            : { background: "var(--color-background-page)", padding: "clamp(48px,6vw,80px) clamp(20px,4vw,40px)" }
        }
      >
        {/* Admin-authored article HTML. Sanitized on save (scripts stripped,
            <style>/classes preserved) and CSS-scoped to .gh-article-body so it
            can't bleed into the site. Rendered server-side for SEO. */}
        <div
          className="gh-article-body gh-article-raw"
          dangerouslySetInnerHTML={{ __html: scopeBlogHtml(post.body) }}
        />
        {reviewerName ? (
          <p className="mx-auto mt-8 max-w-[76ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {blogI18n.clinicallyReviewedBy} {reviewerName}. {blogI18n.lastReviewed} {lastReviewedFormatted}.{" "}
            {blogI18n.medicalDisclaimer}
          </p>
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
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={relatedHrefFor(p)}
                  className="gh2-glass-forest gh2-glass-hover gh-focus-on-dark group flex flex-col p-6"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]">
                    {p.category}
                  </span>
                  <h3
                    className="mt-3 text-[17px] font-bold leading-snug"
                    style={{ color: "rgba(255,255,255,0.92)" }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="mt-3 line-clamp-4 text-[13px] leading-relaxed"
                    style={{ color: "var(--gh2-on-dark-muted)" }}
                  >
                    {p.excerpt}
                  </p>
                  <span
                    className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[12px] font-bold uppercase tracking-[0.14em] transition-colors group-hover:text-[var(--color-brand-accent)]"
                    style={{ color: "var(--gh2-on-dark-faint)" }}
                  >
                    {p.readingTime} {blogI18n.minRead}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
