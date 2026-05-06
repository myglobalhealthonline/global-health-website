import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  asideImage?: { src: string; alt: string };
};

export function BookingCTA({ title, description, ctaLabel, ctaHref, asideImage }: BookingCTAProps) {
  const points = ["100% online", "No waiting rooms", "Confidential"];

  return (
    <Section className="pb-[var(--section-padding-y-sm)]">
      <Container>
        <div className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-[var(--color-brand-secondary)] shadow-[var(--shadow-elevated)] sm:p-10 lg:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
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
            <div className="flex w-full flex-col items-stretch gap-6 sm:flex-row sm:items-center lg:w-auto lg:flex-col lg:items-end">
              {asideImage ? (
                <div className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 sm:mx-0 lg:max-w-[280px]">
                  <Image
                    src={asideImage.src}
                    alt={asideImage.alt}
                    width={560}
                    height={360}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ) : null}
              <Link
                href={ctaHref}
                className="gh-btn w-full bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] hover:bg-white sm:w-auto"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
