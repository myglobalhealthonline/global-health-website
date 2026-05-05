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
      <HeroSection title={title} description={description} primaryCta={{ href: "/book-online", label: "Book Online" }} />
      <Section>
        <Container>
          <article className="mx-auto max-w-3xl space-y-6">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">{section.body}</p>
              </section>
            ))}
          </article>
        </Container>
      </Section>
    </>
  );
}
