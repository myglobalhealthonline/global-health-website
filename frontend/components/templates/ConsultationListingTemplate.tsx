import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { SpecialtiesGrid } from "@/components/sections/SpecialtiesGrid";
import { PricingCard } from "@/components/cards/PricingCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type ConsultationListingTemplateProps = {
  title: string;
  description: string;
  mode: "general" | "specialist";
  primaryCtaLabel?: string;
  secondaryCta?: { label: string; href: string };
  explanation?: { title: string; body: string };
  listing: Array<{
    title: string;
    description: string;
    href: string;
    serviceType?: "general" | "specialist";
    audience?: string;
    duration?: string;
    startingPrice?: string;
  }>;
  pricing?: {
    title: string;
    description?: string;
    items: Array<{ name: string; price: string; description: string }>;
  };
  howItWorks?: {
    title?: string;
    subtitle?: string;
    steps: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  };
  trust?: {
    title?: string;
    subtitle?: string;
    items: Array<{ title: string; description?: string }>;
  };
  faq?: { title?: string; items: Array<{ question: string; answer: string }> };
  bookingHref: string;
  bookingLabel: string;
};

export function ConsultationListingTemplate({
  title,
  description,
  mode,
  primaryCtaLabel,
  secondaryCta,
  explanation,
  listing,
  pricing,
  howItWorks,
  trust,
  faq,
  bookingHref,
  bookingLabel,
}: ConsultationListingTemplateProps) {
  const isSpecialist = mode === "specialist";

  return (
    <>
      <HeroSection
        eyebrow={isSpecialist ? "Specialist consultations" : "General consultations"}
        title={title}
        description={description}
        primaryCta={{ href: bookingHref, label: primaryCtaLabel ?? bookingLabel }}
        secondaryCta={secondaryCta}
        trustBadges={["Licensed clinicians", "Confidential care", "Simple online booking"]}
      />
      {explanation ? (
        <Section className="bg-[var(--color-brand-secondary)] py-[var(--section-padding-y-xs)]">
          <Container>
            <article className="gh-card mx-auto max-w-4xl p-7 sm:p-8">
              <h2 className="gh-h2 text-[var(--color-text-primary)]">{explanation.title}</h2>
              <p className="gh-body mt-3 text-[var(--color-text-muted)]">{explanation.body}</p>
            </article>
          </Container>
        </Section>
      ) : null}
      {isSpecialist ? <SpecialtiesGrid items={listing} /> : <ServicesGrid items={listing} />}
      {pricing?.items.length ? (
        <Section className="bg-[var(--color-brand-secondary)] py-[var(--section-padding-y-xs)]">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="gh-h2 text-[var(--color-text-primary)]">{pricing.title}</h2>
              {pricing.description ? (
                <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{pricing.description}</p>
              ) : null}
            </div>
            <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {pricing.items.map((item) => (
                <PricingCard key={item.name} {...item} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
      {howItWorks ? (
        <HowItWorks title={howItWorks.title} subtitle={howItWorks.subtitle} steps={howItWorks.steps} />
      ) : null}
      {trust ? <TrustSignals title={trust.title} subtitle={trust.subtitle} items={trust.items} /> : null}
      {faq?.items.length ? <FAQSection title={faq.title} items={faq.items} /> : null}
      <BookingCTA
        title="Need help choosing the right consultation?"
        description="Start with booking and your clinician will guide you to the most suitable next step."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
