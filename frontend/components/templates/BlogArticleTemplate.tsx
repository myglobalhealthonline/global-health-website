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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg text-slate-600">{lead}</p>
          <div className="mt-8 space-y-4 text-base leading-7 text-slate-700">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <Link href="/blog" className="mt-8 inline-block text-sm font-semibold text-teal-700 hover:underline">
            Back to Blog
          </Link>
        </article>
      </Container>
    </Section>
  );
}
