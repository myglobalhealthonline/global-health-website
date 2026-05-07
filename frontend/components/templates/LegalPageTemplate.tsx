import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type LegalPageTemplateProps = {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
};

export function LegalPageTemplate({ title, description, sections }: LegalPageTemplateProps) {
  return (
    <Section className="bg-white">
      <Container>
        <article className="mx-auto max-w-4xl">
          <header className="border-b border-[var(--color-border)] pb-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
              Legal documentation
            </p>
            <h1 className="gh-h1 mt-4 text-[var(--color-text-primary)]">{title}</h1>
            <p className="gh-body-lg mt-4 text-[var(--color-text-muted)]">{description}</p>
            <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">Last updated: May 2026</p>
          </header>
          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="gh-h3 text-[var(--color-text-primary)]">{section.heading}</h2>
                <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </Container>
    </Section>
  );
}
