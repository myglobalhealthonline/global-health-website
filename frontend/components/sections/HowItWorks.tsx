"use client";

import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { MapPin, UserRound, Mail } from "lucide-react";
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
  // Only show first 3 steps like Wix
  const displaySteps = steps.slice(0, 3);
  const [imageSrc, setImageSrc] = useState("/images/how-it-works/steps-hero.avif");

  return (
    <Section className="bg-white">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
          <h2 className="gh-h2 mt-2 text-[var(--color-text-primary)]">{subtitle}</h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: Illustration */}
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="relative">
              {/* Green decorative blob behind */}
              <div className="absolute -bottom-6 -left-6 h-[90%] w-[90%] rounded-[2rem] bg-[#C8E6A0]" />

              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
                <img
                  src={imageSrc}
                  alt="Online consultation on a laptop"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImageSrc("/images/hero/homehero.png")}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="flex flex-col gap-8">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;
              
              const IconComponent = stepIcons[index] || MapPin;

              return (
                <div key={`${normalized.title}-${index}`} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C8E6A0]/40 text-[#1B4D3E]">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {normalized.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {normalized.description}
                    </p>
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
