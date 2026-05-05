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
      <Section className="overflow-hidden bg-gradient-to-b from-cyan-50 via-white to-white pb-16 pt-8 sm:pt-10 lg:pb-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
            <div className="max-w-xl">
              {eyebrow ? (
                <p className="inline-flex rounded-full bg-cyan-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-4 max-w-[12ch] text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
                {title}
              </h1>
              <p className="mt-5 max-w-[34rem] text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={primaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-700 px-7 text-sm font-semibold text-white shadow-md transition-colors hover:bg-cyan-800"
                >
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-700 hover:text-cyan-700"
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
              {trustBadges.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {trustBadges.map((badge) => (
                    <li
                      key={badge}
                      className="rounded-full border border-cyan-100 bg-white px-3 py-1 text-xs font-medium text-cyan-800 shadow-sm"
                    >
                      {badge}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {heroImage ? (
              <div className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-cyan-50 p-2 shadow-[0_30px_80px_rgba(8,145,178,0.12)]">
                <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-cyan-200/30 blur-3xl" aria-hidden />
                <Image
                  src={heroImage.src}
                  alt={heroImage.alt}
                  width={1600}
                  height={900}
                  className="relative h-auto w-full rounded-[1.6rem] object-cover"
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
    <Section className="overflow-hidden bg-gradient-to-b from-cyan-50 via-white to-white pb-14 pt-10 sm:pt-14">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          {eyebrow ? (
            <p className="inline-flex rounded-full bg-cyan-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
            <Link
              href={primaryCta.href}
              className="inline-flex min-h-12 items-center rounded-full bg-cyan-700 px-7 text-sm font-semibold text-white shadow-md transition-colors hover:bg-cyan-800"
            >
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-700 hover:text-cyan-700"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
          {trustBadges.length > 0 ? (
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}

          {heroImage ? (
            <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-50 p-2 shadow-sm">
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                width={1600}
                height={700}
                className="h-auto w-full rounded-2xl object-cover"
                priority
              />
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
