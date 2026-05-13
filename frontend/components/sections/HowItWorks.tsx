"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observedSteps = stepRefs.current.filter(Boolean) as HTMLDivElement[];

    if (!observedSteps.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const index = Number(mostVisibleEntry?.target.getAttribute("data-step-index"));
        if (Number.isInteger(index)) setActiveStep(index);
      },
      {
        root: null,
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0.25, 0.5, 0.75],
      },
    );

    observedSteps.forEach((step) => observer.observe(step));

    return () => observer.disconnect();
  }, [displaySteps.length]);

  return (
    <Section variant={variant} pattern="soft" className="relative overflow-hidden">
      <Container className="relative z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
            {title}
          </span>
          <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{subtitle}</h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          {/* LEFT: Illustration */}
          <div className="order-2 mx-auto w-full max-w-md lg:sticky lg:top-28 lg:order-1 lg:max-w-none">
            <div className="relative overflow-hidden rounded-[calc(var(--radius-card)+10px)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-elevated)]">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand-accent)] to-transparent" />
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-soft)]">
                {displaySteps.map((step, index) => {
                  const normalized =
                    typeof step === "string"
                      ? { title: `Step ${index + 1}`, description: step }
                      : step;

                  return (
                    <Image
                      key={stepImages[index]}
                      src={stepImages[index]}
                      alt={`${normalized.title} illustration`}
                      width={1200}
                      height={900}
                      className={`absolute inset-0 h-full w-full object-contain transition-all duration-500 motion-reduce:transition-none ${
                        activeStep === index
                          ? "scale-100 opacity-100"
                          : "scale-[1.025] opacity-0"
                      }`}
                      unoptimized
                    />
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {displaySteps.map((step, index) => {
                  const normalized =
                    typeof step === "string"
                      ? { title: `Step ${index + 1}`, description: step }
                      : step;

                  return (
                    <button
                      key={`${normalized.title}-preview-${index}`}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`h-2 rounded-full transition-colors motion-reduce:transition-none ${
                        activeStep === index
                          ? "bg-[var(--color-brand-primary)]"
                          : "bg-[var(--color-border-strong)] hover:bg-[var(--color-brand-primary)]/50"
                      }`}
                      aria-label={`Show ${normalized.title} illustration`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;

              const IconComponent = stepIcons[index] || MapPin;

              return (
                <div
                  key={`${normalized.title}-${index}`}
                  ref={(node) => {
                    stepRefs.current[index] = node;
                  }}
                  data-step-index={index}
                  onMouseEnter={() => setActiveStep(index)}
                  onFocus={() => setActiveStep(index)}
                  className={`group relative flex gap-5 rounded-[var(--radius-card)] border p-5 transition-all duration-300 motion-reduce:transition-none ${
                    activeStep === index
                      ? "border-[var(--color-brand-primary)]/25 bg-white shadow-[var(--shadow-card-hover)]"
                      : "border-transparent bg-white/70 hover:border-[var(--color-border)] hover:bg-white hover:shadow-[var(--shadow-card)]"
                  }`}
                >
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-colors duration-300 motion-reduce:transition-none ${
                        activeStep === index
                          ? "bg-[var(--color-brand-primary)] text-white"
                          : "bg-[var(--color-background-panel)] text-[var(--color-brand-primary)]"
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {index < displaySteps.length - 1 && (
                      <div className="mt-3 h-full w-px bg-[var(--color-border-strong)]" />
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
