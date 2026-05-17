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
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All articles
      </Link>

      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary)]">
        {post.category}
      </span>

      <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
        {post.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
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

      <p className="mt-6 text-lg leading-relaxed text-slate-600">{post.excerpt}</p>

      <hr className="my-8 border-slate-200" />

      <div
        className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      <div className="mt-12 rounded-xl border border-emerald-100 bg-emerald-50 p-6">
        <p className="text-sm font-semibold text-emerald-900">
          Ready to speak with a doctor?
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          Book an online consultation with a locally-registered doctor in your
          country — same day appointments available.
        </p>
        <Link
          href="/book-online"
          className="mt-4 inline-block rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Book consultation
        </Link>
      </div>
    </main>
  );
}
