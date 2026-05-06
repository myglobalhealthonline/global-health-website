import { Check } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function BookingCTA({ title, description, ctaLabel, ctaHref }: BookingCTAProps) {
  const points = ["100% online", "No waiting rooms", "Confidential"];

  return (
    <Section className="pb-[var(--section-padding-y-sm)]">
      <Container>
        <div className="rounded-[30px] bg-[var(--color-brand-primary)] p-8 text-[var(--color-brand-secondary)] shadow-[var(--shadow-elevated)] sm:p-10 lg:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="gh-h2 text-[var(--color-brand-secondary)]">{title}</h2>
              <p className="gh-body-lg mt-3 max-w-2xl text-white/90">{description}</p>
              <ul className="mt-5 flex flex-wrap gap-3">
                {points.map((point) => (
                  <li key={point} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
                    <Check className="size-4" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <Link href={ctaHref} className="gh-btn bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] hover:bg-white">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
