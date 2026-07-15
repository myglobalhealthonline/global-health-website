import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, User, Calendar, BadgeCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { getBlogPost, type BlogDoctor } from "@/lib/content/get-public-blog";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";

type Props = { params: Promise<{ slug: string }> };

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

// No generateStaticParams: posts are admin-managed (DB) and render on
// demand. An empty generateStaticParams still marks the route for static
// generation, which conflicts with the (global) layout's cookies()/headers()
// usage and throws DYNAMIC_SERVER_USAGE on every request in production.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle ?? `${post.title} | ${SITE_NAME}`,
    description: post.seoDescription ?? post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const formatted = new Date(post.publishedAt).toLocaleDateString("en-GB", {
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
          url: `${getSiteUrl()}/blog/${post.slug}`,
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
        backHref="/blog"
        backLabel="All articles"
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
              {post.readingTime} min read
            </span>
            {reviewerName ? (
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="size-4" aria-hidden />
                Clinically reviewed by{" "}
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
          className="gh-article-body"
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
                Next step
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                style={{
                  fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                Ready to speak with a doctor?
              </h2>
              <p
                className="mt-5 max-w-[48ch] text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {/* Blog articles live outside the [country]/[lang] segment, so we
                  * route through the root country gate (CountryEntryGate at /)
                  * which negotiates the right country + locale for the reader. */}
                Book an online consultation with a locally-registered doctor in
                your country. Open appointments are shown during booking.
              </p>
            </div>
            <Link
              href="/"
              className="gh2-btn-lime lg:justify-self-end"
            >
              Book consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
