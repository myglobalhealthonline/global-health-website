import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type BlogArticleTemplateProps = {
  title: string;
  lead: string;
  bodyHtml: string | null;
  bodyParagraphs: string[];
  author: string;
  reviewer: string;
  category: string;
  updatedAt: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-white opacity-[0.14] [mask-image:radial-gradient(circle_at_72%_32%,black,transparent_72%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="blog-article-plus-pattern"
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

      <rect width="100%" height="100%" fill="url(#blog-article-plus-pattern)" />
    </svg>
  );
}

function MetadataItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)]/10">
        <Icon className="size-5 text-[var(--color-brand-primary)]" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold leading-5 text-[var(--color-text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function isLikelyHeading(paragraph: string) {
  const text = paragraph.trim();

  if (!text) return false;
  if (text.length > 90) return false;
  if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!")) return false;

  return true;
}

export function BlogArticleTemplate({
  title,
  lead,
  bodyHtml,
  bodyParagraphs,
  author,
  reviewer,
  category,
  updatedAt,
}: BlogArticleTemplateProps) {
  const blocks = bodyParagraphs.map((paragraph, index) => {
    const trimmed = paragraph.trim();
    const isHeading = isLikelyHeading(trimmed);

    return {
      id: isHeading ? `${slugify(trimmed)}-${index}` : undefined,
      text: trimmed,
      isHeading,
    };
  });

  const headings = blocks.filter((block) => block.isHeading).slice(0, 8);

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="size-4" />
            Back to Blog
          </Link>

          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
              <BookOpen className="size-4" />
              {category}
            </span>

            <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {title}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75 sm:text-xl">
              {lead}
            </p>
          </div>
        </Container>
      </section>

      {/* ===== ARTICLE BODY ===== */}
      <section className="bg-[var(--color-background-soft)] py-16 sm:py-20 lg:py-28">
        <Container>
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[18rem_1fr]">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    In this article
                  </p>

                  <ol className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
                    {headings.length > 0 ? (
                      headings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            className="transition-colors hover:text-[var(--color-brand-primary)]"
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))
                    ) : (
                      <li>Overview</li>
                    )}
                  </ol>
                </div>

                <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    Medical note
                  </p>

                  <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
                    This article is educational and does not replace personal medical advice.
                  </p>
                </div>
              </div>
            </aside>

            <article className="min-w-0">
              {/* Metadata */}
              <div className="grid gap-3 sm:grid-cols-3">
                <MetadataItem icon={UserRound} label="Author" value={author} />
                <MetadataItem icon={ShieldCheck} label="Medical review" value={reviewer} />
                <MetadataItem icon={CalendarDays} label="Updated" value={updatedAt} />
              </div>

              {/* Content Card */}
              <div className="mt-8 rounded-[2rem] border border-[var(--color-border)] bg-white p-7 shadow-sm sm:p-9 lg:p-12">
                {bodyHtml ? (
                  <div
                    className="gh-blog-html-content"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                ) : (
                  <div className="space-y-7">
                    {blocks.map((block, index) => {
                      if (!block.text) return null;

                      if (block.isHeading) {
                        return (
                          <h2
                            key={`${block.text}-${index}`}
                            id={block.id}
                            className="scroll-mt-28 pt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]"
                          >
                            {block.text}
                          </h2>
                        );
                      }

                      return (
                        <p
                          key={`${block.text}-${index}`}
                          className="text-lg leading-9 text-[var(--color-text-muted)]"
                        >
                          {block.text}
                        </p>
                      );
                    })}
                  </div>
                )}

                <div className="mt-10 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                    <p className="text-sm leading-6 text-amber-800">
                      This article is educational and does not replace personal medical advice. Use
                      emergency services for urgent symptoms.
                    </p>
                  </div>
                </div>

                <div className="mt-10 border-t border-[var(--color-border)] pt-8">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-background-soft)]"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Blog
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}