import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

/**
 * Controls the hero and layout behaviour of `StaticMarketingTemplate`.
 *
 * - `standard`  : full hero with trust badges + media frame. Used for patient-facing service pages.
 * - `light`     : hero without trust badges or media. Used for About, Gift Card, etc.
 * - `document`  : hero without trust badges or media. Used for text-heavy pages like Careers.
 * - `directory` : hero without trust badges or media. Used for partner/network pages.
 * - `pricing`   : hero without trust badges or media. Used for pricing pages.
 * - `faq`       : hero without trust badges or media; FAQ rendered before feature cards.
 */
export type StaticMarketingTemplateVariant =
  | "standard"
  | "light"
  | "document"
  | "directory"
  | "pricing"
  | "faq";

/** Per-variant configuration for hero presentation. */
const VARIANT_CONFIG: Record<
  StaticMarketingTemplateVariant,
  { eyebrow: string; showTrustBadges: boolean; showHeroMedia: boolean; faqFirst: boolean }
> = {
  standard:  { eyebrow: "Healthcare access",  showTrustBadges: true,  showHeroMedia: true,  faqFirst: false },
  light:     { eyebrow: "Global Health",       showTrustBadges: false, showHeroMedia: false, faqFirst: false },
  document:  { eyebrow: "Information",         showTrustBadges: false, showHeroMedia: false, faqFirst: false },
  directory: { eyebrow: "Network",             showTrustBadges: false, showHeroMedia: false, faqFirst: false },
  pricing:   { eyebrow: "Pricing",             showTrustBadges: false, showHeroMedia: false, faqFirst: false },
  faq:       { eyebrow: "FAQ",                 showTrustBadges: false, showHeroMedia: false, faqFirst: true  },
};

const TRUST_BADGES = ["Country-aware booking", "Private intake", "Clinician review when appropriate"];

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
  /** Controls hero presentation and section-order behaviour. Defaults to `"standard"`. */
  variant?: StaticMarketingTemplateVariant;
};

export function StaticMarketingTemplate({
  hero,
  intro,
  features = [],
  faqs,
  relatedLinks = [],
  bottomCta,
  variant = "standard",
}: StaticMarketingTemplateProps) {
  const { eyebrow, showTrustBadges, showHeroMedia, faqFirst } = VARIANT_CONFIG[variant];

  /** Shared feature grid section. */
  const featureGrid =
    features.length > 0 ? (
      <Section className="bg-[var(--color-background-soft)]">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {features.map((feature) => (
              <article key={feature.title} className="gh-card gh-card-hover flex h-full flex-col p-6">
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
    ) : null;

  /** Shared intro card section. */
  const introCard = intro ? (
    <Section className="bg-[var(--color-brand-secondary)] py-[var(--section-padding-y-xs)]">
      <Container>
        <article className="gh-card mx-auto max-w-4xl p-7 sm:p-8">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{intro.title}</h2>
          <p className="gh-body mt-3 text-[var(--color-text-muted)]">{intro.body}</p>
        </article>
      </Container>
    </Section>
  ) : null;

  /** Shared FAQ section. */
  const faqSection = faqs?.items.length ? <FAQSection title={faqs.title} items={faqs.items} /> : null;

  /** Shared related links section. */
  const relatedLinksSection =
    relatedLinks.length > 0 ? (
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
    ) : null;

  return (
    <>
      <HeroSection
        eyebrow={eyebrow}
        title={hero.title}
        description={hero.description}
        primaryCta={hero.primaryCta}
        secondaryCta={hero.secondaryCta}
        trustBadges={showTrustBadges ? TRUST_BADGES : []}
        showMedia={showHeroMedia}
      />

      {/* FAQ-first variant: render FAQ prominently before intro/features. */}
      {faqFirst ? (
        <>
          {faqSection}
          {introCard}
          {featureGrid}
        </>
      ) : (
        <>
          {introCard}
          {featureGrid}
          {faqSection}
        </>
      )}

      {relatedLinksSection}

      {/* Bottom CTA is opt-in: only rendered when the page data provides one. */}
      {bottomCta ? (
        <BookingCTA
          variant="compact"
          eyebrow="Next step"
          title={bottomCta.title}
          description={bottomCta.description}
          ctaLabel={bottomCta.ctaLabel}
          ctaHref={bottomCta.ctaHref}
          showProofPoints={false}
        />
      ) : null}
    </>
  );
}
