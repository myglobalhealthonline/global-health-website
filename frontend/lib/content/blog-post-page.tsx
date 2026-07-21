import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, User, Calendar, BadgeCheck } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getBlogPost, type BlogDoctor, type BlogPostFull } from "@/lib/content/get-public-blog";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd } from "@/lib/seo/structured-data";
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
  return buildPublicMetadata({
    path: canonicalUrl,
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
  });
}

export async function renderBlogPostPage(params: Promise<BlogPostRouteParams>) {
  const resolved = await resolveBlogPostRoute(await params);
  if (resolved.kind === "not-found") notFound();
  if (resolved.kind === "redirect") redirect(resolved.redirectTo);
  const { post, canonicalUrl, backHref } = resolved;

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

  const [authorPhysician, reviewerPhysician] = await Promise.all([
    blogPhysicianInput(post.authorDoctor),
    blogPhysicianInput(post.reviewerDoctor),
  ]);

  // "Clinically reviewed by Dr X" — prefer the linked reviewer doctor (with
  // a profile link), fall back to the free-text reviewer name.
  const reviewerName = post.reviewerDoctor?.name ?? post.reviewer;
  const reviewerHref =
    post.reviewerDoctor?.countrySlug
      ? `/${post.reviewerDoctor.countrySlug}/en/doctors/${post.reviewerDoctor.slug}`
      : null;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.seoDescription ?? post.excerpt,
          url: `${getSiteUrl()}${canonicalUrl}`,
          datePublished: post.publishedAt,
          imageSrc: post.coverImageSrc,
          authorName: post.author,
          authorPhysician,
          reviewerPhysician,
        })}
      />
      <GH2CompactHero
        eyebrow={post.category}
        title={post.title}
        accent=""
        watermark="Blog"
        body={post.excerpt}
        backHref={backHref}
        backLabel={blogI18n.allArticles}
        meta={
          <div className="flex flex-wrap items-center gap-5 text-sm normal-case tracking-normal font-sans">
            <span className="flex items-center gap-1.5">
              <User className="size-4" aria-hidden />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden />
              {formatted}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {post.readingTime} {blogI18n.minRead}
            </span>
            {reviewerName ? (
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="size-4" aria-hidden />
                {blogI18n.clinicallyReviewedBy}{" "}
                {reviewerHref ? (
                  <Link href={reviewerHref} className="underline underline-offset-2">
                    {reviewerName}
                  </Link>
                ) : (
                  reviewerName
                )}
              </span>
            ) : null}
          </div>
        }
      />

      {/* Cover image banner */}
      {post.coverImageSrc ? (
        <div style={{ background: "var(--color-background-page)" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10" style={{ paddingTop: "clamp(32px,4vw,56px)" }}>
            <div
              className="relative w-full overflow-hidden rounded-[var(--radius-card)]"
              style={{ aspectRatio: "2.4 / 1", maxHeight: 460 }}
            >
              <Image
                src={post.coverImageSrc}
                alt={post.coverImageAlt ?? post.title}
                fill
                priority
                sizes="(min-width:1024px) 1024px, 100vw"
                className="object-cover"
                unoptimized={isUnoptimizedImageSrc(post.coverImageSrc)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Article body — full-width; the article's own HTML controls its
          inner layout/width. */}
      <section
        className="mx-auto max-w-[var(--container-width)]"
        style={{ background: "var(--color-background-page)", padding: "clamp(48px,6vw,80px) clamp(20px,4vw,40px)" }}
      >
        {/* Admin-authored article HTML. Sanitized on save (scripts stripped,
            <style>/classes preserved) and CSS-scoped to .gh-article-body so it
            can't bleed into the site. Rendered server-side for SEO. */}
        <div
          className="gh-article-body gh-article-raw"
          dangerouslySetInnerHTML={{ __html: scopeBlogHtml(post.body) }}
        />
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
    </>
  );
}
