import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type LegalPageTemplateProps = {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
};

export function LegalPageTemplate({ title, description, sections }: LegalPageTemplateProps) {
  return (
    <>
      <HeroSection
        eyebrow="Legal information"
        title={title}
        description={description}
        primaryCta={{ href: "/book-online", label: "Book Online" }}
      />
      <Section>
        <Container>
          <article className="gh-card mx-auto max-w-3xl space-y-7 p-7 sm:p-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="gh-h3 text-[var(--color-text-primary)]">{section.heading}</h2>
                <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">{section.body}</p>
              </section>
            ))}
          </article>
        </Container>
      </Section>
    </>
  );
}
