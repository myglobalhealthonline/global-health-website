import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type ServiceDetailTemplateProps = {
  title: string;
  description: string;
  body: string[];
  keyFacts?: Array<{ label: string; value: string }>;
  bookingHref: string;
  bookingLabel: string;
};

export function ServiceDetailTemplate({
  title,
  description,
  body,
  keyFacts = [],
  bookingHref,
  bookingLabel,
}: ServiceDetailTemplateProps) {
  return (
    <>
      <HeroSection title={title} description={description} primaryCta={{ href: bookingHref, label: bookingLabel }} />
      <Section>
        <Container>
          <article className="gh-card mx-auto max-w-3xl p-7 sm:p-8">
            {keyFacts.length > 0 ? (
              <dl className="mb-6 grid gap-2 sm:grid-cols-2">
                {keyFacts.map((fact) => (
                  <div key={fact.label} className="rounded-full bg-[var(--color-background-soft)] px-4 py-2 text-sm">
                    <dt className="inline font-semibold text-[var(--color-text-primary)]">{fact.label}: </dt>
                    <dd className="inline text-[var(--color-text-muted)]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {body.map((paragraph) => (
              <p key={paragraph} className="gh-body text-[var(--color-text-muted)] not-first:mt-4">
                {paragraph}
              </p>
            ))}
          </article>
        </Container>
      </Section>
      <BookingCTA
        title="Book this consultation"
        description="Service scope and eligibility will be confirmed during intake."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
