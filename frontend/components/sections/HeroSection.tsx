import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  trustBadges?: string[];
  heroImage?: { src: string; alt: string };
  variant?: "stacked" | "split";
};

export function HeroSection({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  trustBadges = [],
  heroImage,
  variant = "stacked",
}: HeroSectionProps) {
  if (variant === "split") {
    return (
      <Section className="overflow-hidden bg-[var(--color-background-soft)] pb-16 pt-10 lg:pb-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12">
            <div className="max-w-xl">
              {eyebrow ? (
                <p className="inline-flex rounded-full bg-[var(--color-brand-secondary)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-primary)] shadow-[var(--shadow-card)]">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-5 max-w-[12ch] text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.04]">
                {title}
              </h1>
              <p className="mt-5 max-w-[36rem] text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
                {description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={primaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-7 text-sm font-semibold text-[var(--color-brand-secondary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-brand-primary-hover)]"
                >
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-brand-secondary)] px-7 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-panel)]"
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
              {trustBadges.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {trustBadges.map((badge) => (
                    <li
                      key={badge}
                      className="rounded-full bg-[var(--color-brand-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-primary)] shadow-[var(--shadow-card)]"
                    >
                      {badge}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {heroImage ? (
              <div className="overflow-hidden rounded-[30px] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-elevated)]">
                <Image
                  src={heroImage.src}
                  alt={heroImage.alt}
                  width={1600}
                  height={900}
                  className="h-auto w-full rounded-[24px] object-cover"
                  priority
                />
              </div>
            ) : null}
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="overflow-hidden bg-[var(--color-background-soft)] pb-16 pt-12 lg:pb-20">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          {eyebrow ? (
            <p className="inline-flex rounded-full bg-[var(--color-brand-secondary)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-primary)] shadow-[var(--shadow-card)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.05]">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryCta.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-7 text-sm font-semibold text-[var(--color-brand-secondary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-brand-primary-hover)]"
            >
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-brand-secondary)] px-7 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-panel)]"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
          {trustBadges.length > 0 ? (
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              {trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full bg-[var(--color-brand-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-primary)] shadow-[var(--shadow-card)]"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}

          {heroImage ? (
            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[30px] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-elevated)]">
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                width={1600}
                height={700}
                className="h-auto w-full rounded-[24px] object-cover"
                priority
              />
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
