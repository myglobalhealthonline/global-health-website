import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type ServiceDetailTemplateProps = {
  title: string;
  description: string;
  body: string[];
  bookingHref: string;
  bookingLabel: string;
};

export function ServiceDetailTemplate({
  title,
  description,
  body,
  bookingHref,
  bookingLabel,
}: ServiceDetailTemplateProps) {
  return (
    <>
      <HeroSection title={title} description={description} primaryCta={{ href: bookingHref, label: bookingLabel }} />
      <Section>
        <Container>
          <article className="gh-card mx-auto max-w-3xl p-7 sm:p-8">
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
