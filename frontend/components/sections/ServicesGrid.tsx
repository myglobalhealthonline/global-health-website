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
};

export function ServicesGrid({ title, intro, eyebrow, items }: ServicesGridProps) {
  // Note: the `showRating` block (an unsourced "4.94 · Based on 19 reviews")
  // was removed when the public surface was made fully DB-driven. Re-add only
  // when a real review source (Trustpilot, Google) is wired in.
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

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
