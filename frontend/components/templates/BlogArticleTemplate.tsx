import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BlogArticleTemplateProps = {
  title: string;
  lead: string;
  body: string[];
  author: string;
  reviewer: string;
  category: string;
  updatedAt: string;
};

export function BlogArticleTemplate({
  title,
  lead,
  body,
  author,
  reviewer,
  category,
  updatedAt,
}: BlogArticleTemplateProps) {
  const headings = body.filter((paragraph) => paragraph.length < 90).slice(0, 5);

  return (
    <Section variant="white">
      <Container>
        <article className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[14rem_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                In this article
              </p>
              <ol className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
                {headings.length > 0 ? headings.map((heading) => <li key={heading}>{heading}</li>) : <li>Overview</li>}
              </ol>
            </div>
          </aside>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
              {category}
            </p>
            <h1 className="gh-h1 mt-4 text-[var(--color-text-primary)]">{title}</h1>
            <p className="gh-body-lg mt-4 text-[var(--color-text-muted)]">{lead}</p>
            <div className="mt-5 grid gap-2 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] p-4 text-sm text-[var(--color-text-muted)] sm:grid-cols-3">
              <p>
                <span className="font-semibold text-[var(--color-text-primary)]">Author:</span> {author}
              </p>
              <p>
                <span className="font-semibold text-[var(--color-text-primary)]">Medical review:</span> {reviewer}
              </p>
              <p>
                <span className="font-semibold text-[var(--color-text-primary)]">Updated:</span> {updatedAt}
              </p>
            </div>
            <div className="gh-body mt-8 space-y-4 text-[var(--color-text-muted)]">
              {body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-8 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-800">
              This article is educational and does not replace personal medical advice. Use emergency services for urgent symptoms.
            </div>
            <Link href="/blog" className="gh-link-arrow mt-8 inline-flex">
              Back to Blog
            </Link>
          </div>
        </article>
      </Container>
    </Section>
  );
}
