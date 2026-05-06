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
      <Section className="overflow-hidden bg-[var(--color-background-soft)] pb-[var(--section-padding-y-sm)] pt-10">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
            <div className="max-w-xl" suppressHydrationWarning>
              {eyebrow ? <p className="gh-kicker">{eyebrow}</p> : null}
              <h1 className="mt-5 text-[var(--text-display)] font-extrabold tracking-tight leading-[1.04] text-[var(--color-text-primary)]">
                {title}
              </h1>
              <p className="gh-body-lg mt-5 max-w-[36rem] text-[var(--color-text-muted)]">
                {description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={primaryCta.href} className="gh-btn gh-btn-primary">
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link href={secondaryCta.href} className="gh-btn gh-btn-outline">
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
              {trustBadges.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {trustBadges.map((badge) => (
                    <li
                      key={badge}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-brand-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)]"
                    >
                      {badge}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {heroImage ? (
              <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-1 shadow-[var(--shadow-elevated)]">
                <div className="absolute inset-0 bg-[var(--color-brand-primary)]" />
                <div className="relative overflow-hidden rounded-[20px]">
                  <Image
                    src={heroImage.src}
                    alt={heroImage.alt}
                    width={1600}
                    height={900}
                    className="h-auto min-h-[300px] w-full object-cover opacity-95 lg:min-h-[520px]"
                    priority
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="overflow-hidden bg-[var(--color-background-soft)] pb-[var(--section-padding-y-sm)] pt-12">
      <Container>
        <div className="mx-auto max-w-4xl text-center" suppressHydrationWarning>
          {eyebrow ? <p className="gh-kicker">{eyebrow}</p> : null}
          <h1 className="mt-5 text-[var(--text-display)] font-extrabold tracking-tight leading-[1.05] text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="gh-body-lg mx-auto mt-5 max-w-2xl text-[var(--color-text-muted)]">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href={primaryCta.href} className="gh-btn gh-btn-primary">
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href} className="gh-btn gh-btn-outline">
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
          {trustBadges.length > 0 ? (
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              {trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-brand-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)]"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}

          {heroImage ? (
            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-1 shadow-[var(--shadow-elevated)]">
              <div className="overflow-hidden rounded-[20px]">
                <Image
                  src={heroImage.src}
                  alt={heroImage.alt}
                  width={1600}
                  height={700}
                  className="h-auto min-h-[280px] w-full object-cover opacity-95 lg:min-h-[480px]"
                  priority
                />
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
