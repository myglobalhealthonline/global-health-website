import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";

type BlogIndexTemplateProps = {
  title: string;
  description: string;
  posts: Array<{
    title: string;
    excerpt: string;
    href: string;
    coverImageSrc: string | null;
    coverImageAlt: string | null;
  }>;
};

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-white opacity-[0.14] [mask-image:radial-gradient(circle_at_72%_32%,black,transparent_72%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="blog-index-plus-pattern"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 18v20M18 28h20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#blog-index-plus-pattern)" />
    </svg>
  );
}

function BlogArticleCard({
  title,
  excerpt,
  href,
  coverImageSrc,
  coverImageAlt,
}: {
  title: string;
  excerpt: string;
  href: string;
  coverImageSrc: string | null;
  coverImageAlt: string | null;
}) {
  const imageAlt = coverImageAlt?.trim() || `Cover image: ${title}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      {coverImageSrc ? (
        <Link href={href} className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--color-background-soft)]">
          <Image
            src={coverImageSrc}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col p-6">
      {!coverImageSrc ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
          <FileText className="size-6 text-[var(--color-brand-primary)]" />
        </div>
      ) : null}

      <Link href={href} className={`block ${coverImageSrc ? "mt-0" : "mt-6"}`}>
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
          {title}
        </h2>
      </Link>

      <p className="mt-4 line-clamp-4 text-base leading-7 text-[var(--color-text-muted)]">
        {excerpt}
      </p>

      <div className="mt-auto pt-7">
        <Link
          href={href}
          className="group/link inline-flex items-center gap-2 text-sm font-bold text-[var(--color-brand-primary)]"
        >
          Read article
          <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
        </Link>
      </div>
      </div>
    </article>
  );
}

function FeaturedArticleCard({
  title,
  excerpt,
  href,
  coverImageSrc,
  coverImageAlt,
}: {
  title: string;
  excerpt: string;
  href: string;
  coverImageSrc: string | null;
  coverImageAlt: string | null;
}) {
  const imageAlt = coverImageAlt?.trim() || `Cover image: ${title}`;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative min-h-[260px] overflow-hidden bg-[var(--color-brand-primary)] text-white">
          {coverImageSrc ? (
            <Link href={href} className="relative block h-full min-h-[260px] w-full">
              <Image
                src={coverImageSrc}
                alt={imageAlt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                  <BookOpen className="size-4" />
                  Featured article
                </span>
              </div>
            </Link>
          ) : (
            <>
              <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 opacity-20" />
              <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 left-10 size-52 rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />

              <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-between p-8">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                  <BookOpen className="size-4" />
                  Featured article
                </span>

                <div className="mt-12">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
                    Patient education
                  </p>
                  <p className="mt-3 max-w-sm text-2xl font-extrabold leading-tight text-white">
                    Healthcare guidance written for easier reading.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-7 sm:p-9 lg:p-10">
          <Link href={href}>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)] sm:text-4xl">
              {title}
            </h2>
          </Link>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">
            {excerpt}
          </p>

          <div className="mt-8">
            <Link
              href={href}
              className="group/link inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              Read article
              <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--color-border)] bg-white p-8 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
        <BookOpen className="size-7 text-[var(--color-brand-primary)]" />
      </div>

      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
        Editorial articles are being prepared
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-text-muted)]">
        We publish healthcare articles only when author, review, and update details are ready. For
        personal advice, start with the consultation pages.
      </p>

      <div className="mt-7">
        <Link
          href="/general-consultation-ie"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
        >
          Explore consultations
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function BlogIndexTemplate({ title, description, posts }: BlogIndexTemplateProps) {
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);
  const articleCount = posts.length === 1 ? "1 article" : `${posts.length} articles`;

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
              <BookOpen className="size-4" />
              Patient education
            </span>

            <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {title}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              {description}
            </p>

            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="size-5 text-[var(--color-brand-accent)]" />
                  <p className="text-sm font-bold text-white">{articleCount}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="size-5 text-[var(--color-brand-accent)]" />
                  <p className="text-sm font-bold text-white">Reviewed content</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="size-5 text-[var(--color-brand-accent)]" />
                  <p className="text-sm font-bold text-white">Updated before publishing</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link
                href="#articles"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
              >
                Browse articles
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== ARTICLES ===== */}
      <section id="articles" className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
        <Container>
          {posts.length > 0 ? (
            <div className="space-y-8">
              {featuredPost ? <FeaturedArticleCard {...featuredPost} /> : null}

              {remainingPosts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingPosts.map((post) => (
                    <BlogArticleCard key={post.href} {...post} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState />
          )}
        </Container>
      </section>
    </>
  );
}