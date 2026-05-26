"use client";

/**
 * How it works — dark luxury version.
 * Forest-night canvas, lime step badges, glass step cards,
 * sticky image panel with scroll-driven activation.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

export function HowItWorks({ title = "How it works", subtitle, steps }: HowItWorksProps) {
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
    <section
      style={{
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {title}
          </p>
          {subtitle ? (
            <h2
              className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {subtitle}
            </h2>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          {/* LEFT: Image panel */}
          <div className="order-2 mx-auto w-full max-w-md lg:sticky lg:top-28 lg:order-1 lg:max-w-none">
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "calc(var(--radius-card) + 8px)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: "12px",
              }}
            >
              {/* Lime top hairline */}
              <div
                aria-hidden
                className="absolute inset-x-8 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(176,241,34,0.35), transparent)" }}
              />

              <div
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "4/3",
                  borderRadius: "var(--radius-card)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
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
                        activeStep === index ? "scale-100 opacity-100" : "scale-[1.025] opacity-0"
                      }`}
                      unoptimized
                    />
                  );
                })}
              </div>

              {/* Progress dots */}
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
                      className="h-1.5 rounded-full transition-colors duration-200 motion-reduce:transition-none"
                      style={{
                        background:
                          activeStep === index
                            ? "var(--color-brand-accent)"
                            : "rgba(255,255,255,0.15)",
                      }}
                      aria-label={`Show ${normalized.title} illustration`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="order-1 flex flex-col gap-4 lg:order-2">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;
              const IconComponent = stepIcons[index] ?? MapPin;
              const isActive = activeStep === index;

              return (
                <div
                  key={`${normalized.title}-${index}`}
                  ref={(node) => { stepRefs.current[index] = node; }}
                  data-step-index={index}
                  onMouseEnter={() => setActiveStep(index)}
                  onFocus={() => setActiveStep(index)}
                  className="group relative flex gap-5 cursor-default transition-all duration-300 motion-reduce:transition-none"
                  style={{
                    borderRadius: "var(--radius-card)",
                    padding: "clamp(20px,2.5vw,28px)",
                    border: isActive
                      ? "1px solid rgba(176,241,34,0.22)"
                      : "1px solid rgba(255,255,255,0.07)",
                    background: isActive
                      ? "rgba(176,241,34,0.04)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  {/* Icon + connector */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div
                      className="flex size-12 items-center justify-center rounded-2xl transition-colors duration-300 motion-reduce:transition-none"
                      style={
                        isActive
                          ? { background: "var(--color-brand-accent)", color: "#0a1f14" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }
                      }
                    >
                      <IconComponent className="size-5" aria-hidden />
                    </div>
                    {index < displaySteps.length - 1 && (
                      <div
                        className="mt-3 h-full w-px"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-8">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: "var(--color-brand-accent)" }}
                    >
                      Step {index + 1}
                    </span>
                    <h3
                      className="mt-1.5 text-base font-bold leading-snug"
                      style={{ color: "rgba(255,255,255,0.92)" }}
                    >
                      {normalized.title}
                    </h3>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.52)", maxWidth: "40ch" }}
                    >
                      {normalized.description}
                    </p>
                    {normalized.ctaLabel && normalized.ctaHref && (
                      <a
                        href={normalized.ctaHref}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-75 motion-reduce:transition-none"
                        style={{ color: "var(--color-brand-accent)" }}
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
      </div>
    </section>
  );
}
