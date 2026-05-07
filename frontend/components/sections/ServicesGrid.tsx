import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Star } from "lucide-react";

type Item = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
};

type ServicesGridProps = {
  title?: string;
  intro?: string;
  eyebrow?: string;
  cta?: { label: string; href: string };
  items: Item[];
  showRating?: boolean;
};

export function ServicesGrid({ title, intro, eyebrow, cta, items, showRating = false }: ServicesGridProps) {
  return (
    <Section className="bg-white">
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-10">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
              {eyebrow}
            </span>
          )}
          {title && <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{title}</h2>}
          {intro && <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{intro}</p>}
          
          {showRating && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">4.94</span>
              <span className="text-sm text-[var(--color-text-muted)]">Based on 19 reviews, verified by doctify</span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="mx-auto max-w-6xl grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
