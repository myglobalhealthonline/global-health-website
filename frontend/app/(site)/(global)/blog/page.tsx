import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { listBlogPosts } from "@/lib/content/get-public-blog";
import { BlogCard } from "@/components/cards/BlogCard";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Stethoscope, ShieldCheck, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: `Health Blog | ${SITE_NAME}`,
  description:
    "Guides, explainers, and health education from the Global Health medical team covering telemedicine, online consultations, lab tests, and more.",
};

export default async function BlogIndexPage() {
  const ordered = await listBlogPosts();

  return (
    <>
      <PageHero
        watermark="Blog"
        countryLabel="Global Health · Blog"
        titleLead="Health guides"
        titleAccent="articles."
        lede="Evidence-based guides written and reviewed by our medical team. No ads, no fluff."
        ctaLabel="Browse articles"
        ctaHref="#articles"
        secondaryLabel="Back to home"
        secondaryHref="/"
        rightSlot={<BlogArchPanel articleCount={ordered.length} />}
        mobileBgSrc="/images/stock/blog.webp"
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: "Doctor-reviewed",
            subtitle: "Verified by clinicians",
          },
          {
            icon: <BookOpen className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: `${ordered.length} articles`,
            subtitle: "Available now",
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: "Evidence-based",
            subtitle: "No ads, no sponsors",
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
                No articles published yet
              </h2>
              <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                Check back soon for medical guides and service explainers.
              </p>
              <Link href="/" className="mt-6 inline-flex rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
                Back to country selection
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 [&>*:first-child]:lg:col-span-2">
              {ordered.map((post) => (
                <BlogCard
                  key={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  href={`/blog/${post.slug}`}
                  category={post.category}
                  publishedAt={post.publishedAt}
                  coverImageSrc={post.coverImageSrc}
                  coverImageAlt={post.coverImageAlt}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function BlogArchPanel({ articleCount }: { articleCount: number }) {
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
        <BookOpen className="size-5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{articleCount} {articleCount === 1 ? "article" : "articles"}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">Available now</span>
        </span>
      </div>

      {/* Floating — Doctor reviewed */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-4 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Stethoscope className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">Doctor-reviewed</span>
          <span className="block text-[11.5px] leading-tight text-white/55">Verified by clinicians</span>
        </span>
      </div>

      {/* Floating — Evidence based */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-8 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <ShieldCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">Evidence-based</span>
          <span className="block text-[11.5px] leading-tight text-white/55">No ads, no sponsors</span>
        </span>
      </div>
    </div>
  );
}
