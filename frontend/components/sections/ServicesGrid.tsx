import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type Item = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
  imageSrc?: string | null;
};

type ServicesGridProps = {
  title?: string;
  intro?: string;
  eyebrow?: string;
  items: Item[];
  /** When true, the first card spans 2x2 on lg viewports — breaks the
   *  3-up-identical-cards pattern when there are 4+ services. Caller
   *  is responsible for choosing which item to promote (typically the
   *  most-booked or country-flagship service). Defaults to true. */
  featureFirst?: boolean;
};

export function ServicesGrid({
  title,
  intro,
  eyebrow,
  items,
  featureFirst = true,
}: ServicesGridProps) {
  // The promoted-first-card composition only reads as intentional when
  // there are enough cards to fill the row beneath the featured tile;
  // below that, fall back to a flat 3-up which reads cleaner.
  const useFeatured = featureFirst && items.length >= 4;
  return (
    <Section variant="white" pattern="soft">
      <Container>
        {/* Header */}
        <div className="mb-12 lg:mb-14">
          {eyebrow && (
            <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
              {eyebrow}
            </span>
          )}
          {title && <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{title}</h2>}
          {intro && <p className="gh-body-lg mt-3 max-w-2xl text-[var(--color-text-muted)]">{intro}</p>}
        </div>

        <div
          className={
            useFeatured
              ? "gh-card-grid gh-card-grid--featured"
              : "gh-card-grid"
          }
        >
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
