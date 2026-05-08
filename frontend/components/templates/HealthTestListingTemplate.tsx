import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { BookingCTA } from "@/components/sections/BookingCTA";

type Item = {
  title: string;
  shortDescription: string;
  price: string;
  imageSrc: string;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  href: string;
  ctaLabel: string;
};

type Props = {
  title: string;
  description: string;
  items: Item[];
};

export function HealthTestListingTemplate({ title, description, items }: Props) {
  return (
    <>
      <Section variant="white" pattern="soft">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="gh-heading-eyebrow">Home Health Tests</p>
            <h1 className="gh-h1 mt-4 text-[var(--color-text-primary)]">{title}</h1>
            <p className="gh-body-lg mt-4 text-[var(--color-text-muted)]">{description}</p>
          </div>
          <div className="mt-14 grid gap-8">
            {items.map((item) => (
              <article key={item.href} className="grid gap-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] lg:grid-cols-[280px_1fr] lg:items-center">
                <div className="flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageSrc} alt={item.title} className="max-h-[340px] w-auto object-contain" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-[var(--color-brand-primary)]">{item.title}</h2>
                  <p className="mt-4 text-4xl font-black text-[var(--color-brand-primary)]">{item.price}</p>
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">{item.shortDescription}</p>
                  {item.sampleType ? <p className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">{item.sampleType}</p> : null}
                  {item.resultsTimeline ? <p className="mt-3 text-lg leading-relaxed text-[var(--color-text-muted)]">{item.resultsTimeline}</p> : null}
                  <Link href={item.href} className="gh-btn gh-btn-primary mt-8 inline-flex min-w-[220px] justify-center">
                    {item.ctaLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <BookingCTA
        variant="compact"
        eyebrow="Start Your Online Consultation"
        title="Choose your country and connect with a licensed doctor in minutes"
        description="100% online, no waiting rooms, confidential."
        ctaLabel="Start Consultation"
        ctaHref="/general-consultation-ie"
      />
    </>
  );
}
