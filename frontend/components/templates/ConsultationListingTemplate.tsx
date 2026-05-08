import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PricingCard } from "@/components/cards/PricingCard";
import { ConsultationDestinationCard } from "@/components/cards/ConsultationDestinationCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { CheckCircle, Search, Star } from "lucide-react";

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
    imageSrc?: string;
    themeColor?: string;
    stats?: string;
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
  /**
   * Whether to render the static review/star score block in the page header.
   * Defaults to `true` for general mode; pass `false` for specialist listings
   * where the score is not mode-specific.
   */
  showReviewScore?: boolean;
  /**
   * Whether to render the bottom `BookingCTA` section.
   * Defaults to `true`. Pass `false` when the page already provides sufficient
   * decision prompts through listing cards or guidance strips.
   */
  showFinalCta?: boolean;
  /**
   * Controls which guidance strip variant is shown below the listing grid.
   * - `"general"` — GP-focused tips (default for general mode).
   * - `"specialist"` — specialty/choice-focused tips (default for specialist mode).
   * - `"none"` — omit the guidance strip entirely.
   */
  guidanceVariant?: "general" | "specialist" | "none";
};

export function ConsultationListingTemplate({
  title,
  description,
  mode,
  listing,
  pricing,
  howItWorks,
  faq,
  bookingHref,
  bookingLabel,
  showReviewScore = false,
  showFinalCta = true,
  guidanceVariant,
}: ConsultationListingTemplateProps) {
  const isSpecialist = mode === "specialist";

  // Resolve the effective guidance variant: caller can override, otherwise infer from mode.
  const effectiveGuidanceVariant = guidanceVariant ?? (isSpecialist ? "specialist" : "general");

  return (
    <>
      <section className="bg-white pb-8 pt-12 sm:pt-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
              {isSpecialist ? "Specialist directory" : "GP consultation guide"}
            </span>
            <h1 className="mt-4 text-[var(--text-display)] font-extrabold leading-[1.05] tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-text-muted)]">{description}</p>

            {showReviewScore ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="size-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-lg font-bold text-[var(--color-text-primary)]">4.94</span>
                <span className="text-sm text-[var(--color-text-muted)]">Verified review score where available</span>
              </div>
            ) : null}

            <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--color-text-muted)]">
              {isSpecialist
                ? "Compare specialties by clinical fit before booking. If you are unsure, start with a GP consultation."
                : "Use this page to choose a first-contact consultation for non-emergency symptoms, medication questions, or follow-up advice."}
            </p>
          </div>
        </Container>
      </section>

      <Section variant="white" pattern="soft" className="py-10">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listing.map((item) => (
              <ConsultationDestinationCard
                key={item.href}
                href={item.href}
                title={item.title}
                description={item.description}
                stats={item.stats ?? [item.duration, item.startingPrice].filter(Boolean).join(" • ")}
                imageSrc={item.imageSrc}
                themeColor={item.themeColor ?? "150 50% 25%"}
                ctaLabel={isSpecialist ? "Explore Now" : "Learn More"}
              />
            ))}
          </div>
        </Container>
      </Section>

      {effectiveGuidanceVariant !== "none" ? (
        <Section variant="soft" pattern="soft" className="py-8">
          <Container>
            <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 md:grid-cols-3">
              {(effectiveGuidanceVariant === "specialist"
                ? [
                    ["Choose by symptoms", "Use specialty cards to match the area of concern."],
                    ["Check suitability", "Some concerns may need GP, urgent, or in-person care first."],
                    ["Prepare records", "Bring reports, medications, or photos where relevant."],
                  ]
                : [
                    ["Start with GP care", "Good for common, non-emergency concerns and follow-up questions."],
                    ["Know the limits", "Emergency symptoms require urgent or local in-person care."],
                    ["Prepare context", "Share symptoms, medicines, allergies, and recent changes."],
                  ]).map(([heading, copy]) => (
                <div key={heading} className="flex gap-3">
                  {effectiveGuidanceVariant === "specialist" ? (
                    <Search className="mt-1 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                  ) : (
                    <CheckCircle className="mt-1 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                  )}
                  <div>
                    <h2 className="font-bold text-[var(--color-text-primary)]">{heading}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {pricing?.items.length ? (
        <Section variant="white">
          <Container>
            <div className="mx-auto max-w-3xl text-center mb-10">
              <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                Pricing
              </span>
              <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{pricing.title}</h2>
              {pricing.description ? (
                <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{pricing.description}</p>
              ) : null}
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {faq?.items.length ? <FAQSection title={faq.title} items={faq.items} /> : null}

      {showFinalCta ? (
        <BookingCTA
          variant={isSpecialist ? "support" : "compact"}
          eyebrow={isSpecialist ? "Specialist booking" : "GP booking"}
          title={isSpecialist ? "Find the right specialist" : "Choose a GP consultation"}
          description={
            isSpecialist
              ? "Review the specialty options and book the route that best matches your concern."
              : "Choose the consultation type that matches your concern and complete the intake form."
          }
          ctaLabel={bookingLabel}
          ctaHref={bookingHref}
          showProofPoints={!isSpecialist}
        />
      ) : null}
    </>
  );
}
