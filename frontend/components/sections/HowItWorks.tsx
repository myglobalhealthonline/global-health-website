"use client";

import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { MapPin, UserRound, Mail } from "lucide-react";

const stepIcons = [MapPin, UserRound, Mail];
const stepImages = [
  "/images/how-it-works/step-1.png",
  "/images/how-it-works/step-2.png",
  "/images/how-it-works/step-3.png",
];

type HowItWorksStep =
  | string
  | {
      title: string;
      description: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

type HowItWorksProps = {
  title?: string;
  subtitle?: string;
  steps: HowItWorksStep[];
  variant?: "white" | "soft";
};

export function HowItWorks({ title = "How it works", subtitle, steps, variant = "soft" }: HowItWorksProps) {
  const displaySteps = steps.slice(0, 3);

  return (
    <Section variant={variant}>
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-14">
          <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
            {title}
          </span>
          <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{subtitle}</h2>
        </div>

        <div className="mx-auto max-w-5xl grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* LEFT: Illustration */}
          <div className="relative mx-auto max-w-md lg:max-w-none order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-elevated)] ring-1 ring-[var(--color-border)]">
              <Image
                src={stepImages[0]}
                alt="Simple scheduling flow illustration"
                width={1200}
                height={900}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="flex flex-col gap-8 order-1 lg:order-2">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;

              const IconComponent = stepIcons[index] || MapPin;

              return (
                <div
                  key={`${normalized.title}-${index}`}
                  className="group relative flex gap-5"
                >
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)] text-white shadow-sm">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {index < displaySteps.length - 1 && (
                      <div className="mt-3 h-full w-px bg-[var(--color-border)]" />
                    )}
                  </div>

                  <div className="flex-1 pb-8">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                      Step {index + 1}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
                      {normalized.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {normalized.description}
                    </p>
                    {normalized.ctaLabel && normalized.ctaHref && (
                      <a
                        href={normalized.ctaHref}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        {normalized.ctaLabel}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
