import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { getBlogPost } from "@/lib/content/get-public-blog";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  // All posts are admin-managed (DB) and render on demand.
  return [];
}

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

  return (
    <>
      {/* Dark hero header */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(48px,6vw,80px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 90% -10%, rgba(176,241,34,0.09), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            All articles
          </Link>

          <p
            className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {post.category}
          </p>

          <h1
            className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.05]"
            style={{
              fontSize: "clamp(1.85rem,4vw,3rem)",
              color: "rgba(255,255,255,0.93)",
            }}
          >
            {post.title}
          </h1>

          <p
            className="mt-4 max-w-[60ch] text-[length:var(--text-body-lg)] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {post.excerpt}
          </p>

          <div
            className="mt-6 flex flex-wrap items-center gap-5 text-sm"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
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
          </div>
        </div>
      </section>

      {/* Cover image banner */}
      {post.coverImageSrc ? (
        <div style={{ background: "var(--color-background-page)" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10" style={{ paddingTop: "clamp(32px,4vw,56px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageSrc}
              alt={post.coverImageAlt ?? post.title}
              className="block w-full rounded-[var(--radius-card)] object-cover"
              style={{ maxHeight: 460 }}
            />
          </div>
        </div>
      ) : null}

      {/* Article body — full-width; the article's own HTML controls its
          inner layout/width. */}
      <main
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
      </main>

      {/* Dark CTA block — matches luxury language of the rest of the site */}
      <section
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(64px,8vw,100px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
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
                your country. Same-day appointments available.
              </p>
            </div>
            <Link
              href="/"
              className="gh-btn gh-btn-accent lg:justify-self-end"
            >
              Book consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
