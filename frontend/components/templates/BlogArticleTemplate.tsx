import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BlogArticleTemplateProps = {
  title: string;
  lead: string;
  body: string[];
};

export function BlogArticleTemplate({ title, lead, body }: BlogArticleTemplateProps) {
  return (
    <Section>
      <Container>
        <article className="mx-auto max-w-3xl">
          <h1 className="gh-h1 text-[var(--color-text-primary)]">{title}</h1>
          <p className="gh-body-lg mt-4 text-[var(--color-text-muted)]">{lead}</p>
          <div className="gh-body mt-8 space-y-4 text-[var(--color-text-muted)]">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <Link href="/blog" className="gh-link-arrow mt-8">
            Back to Blog
          </Link>
        </article>
      </Container>
    </Section>
  );
}
