import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type StaticMarketingTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  intro?: { title: string; body: string };
  features?: Array<{ title: string; description: string; href?: string; ctaLabel?: string }>;
  faqs?: { title?: string; items: Array<{ question: string; answer: string }> };
  relatedLinks?: Array<{ label: string; href: string }>;
  bottomCta?: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

export function StaticMarketingTemplate({
  hero,
  intro,
  features = [],
  faqs,
  relatedLinks = [],
  bottomCta,
}: StaticMarketingTemplateProps) {
  return (
    <>
      <HeroSection
        title={hero.title}
        description={hero.description}
        primaryCta={hero.primaryCta}
        secondaryCta={hero.secondaryCta}
      />
      {intro ? (
        <Section className="bg-[var(--color-brand-secondary)] py-[var(--section-padding-y-xs)]">
          <Container>
            <article className="gh-card mx-auto max-w-4xl p-7 sm:p-8">
              <h2 className="gh-h2 text-[var(--color-text-primary)]">{intro.title}</h2>
              <p className="gh-body mt-3 text-[var(--color-text-muted)]">{intro.body}</p>
            </article>
          </Container>
        </Section>
      ) : null}
      {features.length > 0 ? (
        <Section className="bg-[var(--color-background-soft)]">
          <Container>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {features.map((feature) => (
                <article key={feature.title} className="gh-card flex h-full flex-col p-6">
                  <h3 className="gh-h3 text-[var(--color-text-primary)]">{feature.title}</h3>
                  <p className="gh-body-sm mt-3 flex-1 text-[var(--color-text-muted)]">
                    {feature.description}
                  </p>
                  {feature.href ? (
                    <Link href={feature.href} className="gh-link-arrow mt-5">
                      {feature.ctaLabel ?? "Learn more"}
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
      {faqs?.items.length ? <FAQSection title={faqs.title} items={faqs.items} /> : null}
      {relatedLinks.length > 0 ? (
        <Section className="bg-[var(--color-brand-secondary)] py-[var(--section-padding-y-xs)]">
          <Container>
            <div className="gh-card mx-auto max-w-4xl p-6 sm:p-8">
              <h2 className="gh-h3 text-[var(--color-text-primary)]">Related pages</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="gh-link-arrow">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </Section>
      ) : null}
      {bottomCta ? (
        <BookingCTA
          title={bottomCta.title}
          description={bottomCta.description}
          ctaLabel={bottomCta.ctaLabel}
          ctaHref={bottomCta.ctaHref}
        />
      ) : null}
    </>
  );
}
