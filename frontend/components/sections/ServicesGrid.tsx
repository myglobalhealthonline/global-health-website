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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h2>
            {intro ? <p className="mt-3 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">{intro}</p> : null}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-brand-secondary)] px-5 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-panel)]"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
