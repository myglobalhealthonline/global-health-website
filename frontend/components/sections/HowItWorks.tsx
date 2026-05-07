"use client";

import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { MapPin, UserRound, Mail, ArrowRight } from "lucide-react";
import { useState } from "react";

const stepIcons = [MapPin, UserRound, Mail];

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
};

export function HowItWorks({ title = "How it works", subtitle, steps }: HowItWorksProps) {
  const displaySteps = steps.slice(0, 3);
  const [imageSrc, setImageSrc] = useState("/images/how-it-works/steps-hero.png");
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Section className="bg-white relative overflow-hidden">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
            {title}
          </span>
          <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{subtitle}</h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: Illustration */}
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="relative">
              <div className="absolute -bottom-4 -left-4 h-[92%] w-[92%] rounded-[2rem] bg-[var(--color-brand-accent)]/60" />
              
              <div className="relative overflow-hidden rounded-[2rem] bg-[var(--color-background-soft)] shadow-2xl ring-1 ring-black/5">
                <Image
                  src={imageSrc}
                  alt="Simple scheduling flow illustration"
                  width={1200}
                  height={900}
                  className="h-auto w-full object-contain"
                  unoptimized
                  onError={() => setImageSrc("/images/hero/homehero.png")}
                />
                <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 backdrop-blur-sm px-4 py-2 shadow-lg">
                  <p className="text-sm font-bold text-[var(--color-brand-primary)]">Step {activeStep + 1} of 3</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="flex flex-col gap-6">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;
              
              const IconComponent = stepIcons[index] || MapPin;
              const isActive = activeStep === index;

              return (
                <div
                  key={`${normalized.title}-${index}`}
                  className={`group relative flex gap-5 p-4 rounded-2xl transition-all duration-300 cursor-pointer ${isActive ? "bg-[var(--color-background-soft)] shadow-lg ring-1 ring-[var(--color-brand-primary)]/10" : "hover:bg-[var(--color-background-soft)]/50"}`}
                  onMouseEnter={() => setActiveStep(index)}
                >
                  {index < displaySteps.length - 1 && (
                    <div className="absolute left-[2.25rem] top-[4.5rem] h-[calc(100%-2rem)] w-px bg-gradient-to-b from-[var(--color-brand-primary)]/20 to-transparent" />
                  )}
                  
                  <div className="relative shrink-0">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-accent)]/40 border border-[var(--color-brand-primary)]/15 transition-transform duration-300 group-hover:scale-110`}>
                      <IconComponent className="h-5 w-5 text-[var(--color-brand-primary)]" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white text-xs font-bold shadow-md">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      {normalized.title}
                      <ArrowRight className={`size-4 transition-all duration-300 ${isActive ? "opacity-100 translate-x-0 text-[var(--color-brand-primary)]" : "opacity-0 -translate-x-2"}`} />
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {normalized.description}
                    </p>
                    {normalized.ctaLabel && normalized.ctaHref && (
                      <a
                        href={normalized.ctaHref}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        {normalized.ctaLabel}
                        <ArrowRight className="size-3.5" />
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
