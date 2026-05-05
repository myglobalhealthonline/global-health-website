import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function HeroSection({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
}: HeroSectionProps) {
  return (
    <Section className="bg-gradient-to-b from-teal-50/80 to-white pb-10">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p> : null}
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={primaryCta.href} className="inline-flex min-h-11 items-center rounded-full bg-teal-700 px-6 text-sm font-semibold text-white hover:bg-teal-800">
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-6 text-sm font-semibold text-slate-700 hover:border-slate-400">
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
