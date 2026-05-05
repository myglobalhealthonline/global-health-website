import Link from "next/link";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type Item = { title: string; description: string; href: string };

type ServicesGridProps = {
  title?: string;
  intro?: string;
  cta?: { label: string; href: string };
  items: Item[];
};

export function ServicesGrid({ title = "Services", intro, cta, items }: ServicesGridProps) {
  return (
    <Section className="bg-[var(--color-background-soft)]">
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
            {intro ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{intro}</p> : null}
          </div>
          {cta ? (
            <Link href={cta.href} className="gh-btn gh-btn-outline">
              {cta.label}
            </Link>
          ) : null}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:gap-6">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
