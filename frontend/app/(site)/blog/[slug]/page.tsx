import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { blogPosts } from "@/data/blog-posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const formatted = new Date(post.publishedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Article body — light, wide enough for long-form prose */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-primary)] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All articles
        </Link>

        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary)]">
          {post.category}
        </span>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] leading-tight text-[var(--color-text-primary)] sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
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

        <p className="mt-6 text-lg leading-relaxed text-[var(--color-text-muted)]">
          {post.excerpt}
        </p>

        <hr className="my-8 border-[var(--color-border)]" />

        <div
          className="prose max-w-none prose-headings:font-extrabold prose-headings:tracking-[-0.02em] prose-headings:text-[var(--color-text-primary)] prose-h2:text-xl prose-h2:mt-8 prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-p:text-[var(--color-text-body)] prose-li:leading-relaxed prose-li:text-[var(--color-text-body)] prose-a:text-[var(--color-brand-primary)] prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.body }}
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
                  fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                Ready to speak with a doctor?
              </h2>
              <p
                className="mt-5 max-w-[48ch] text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.50)" }}
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
