/**
 * Final CTA — the page's second and last dark moment.
 * Deep-night canvas, single lime bloom, expanding "Live" ring stat
 * left, oversized headline + CTAs right. Bookends the hero.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export type FinalCtaI18n = {
  eyebrow: string;
  liveLabel: string;
  calendarLine: string;
  headlinePre: string;
  headlineAccent: string;
  headlinePost: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
};

export function FinalCTA({
  primaryHref = "/",
  secondaryHref = "/contact",
  i18n,
}: {
  primaryHref?: string;
  secondaryHref?: string;
  i18n?: FinalCtaI18n;
}) {
  return (
    <section
      className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
      style={{
        background:
          "radial-gradient(900px 560px at 92% -12%, rgba(176,241,34,0.10), transparent 60%), linear-gradient(168deg, #15382A 0%, #0F2E25 60%, #0B241C 100%)",
      }}
    >
      <div
        className="
          relative z-[1]
          mx-auto max-w-[var(--container-width)]
          px-5 md:px-10
          gh-section
        "
      >
        {/* Main grid */}
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-20 min-h-[400px]">
          {/* Left — oversized "Live" stat with expanding ring */}
          <RevealOnScroll delay={0}>
            <div>
              <p className="flex items-center gap-5">
                <span aria-hidden className="gh2-live-dot mt-2 shrink-0" />
                <span
                  className="font-extrabold leading-none tracking-[-0.05em] [font-variant-numeric:tabular-nums]"
                  style={{
                    fontSize: "clamp(5rem,13vw,9.5rem)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  {i18n?.liveLabel ?? "Live"}
                </span>
              </p>
              <p
                className="mt-6 font-bold tracking-[-0.02em]"
                style={{
                  fontSize: "clamp(1.1rem,2vw,1.5rem)",
                  color: "rgba(255,255,255,0.55)",
                  maxWidth: "24ch",
                }}
              >
                {i18n?.calendarLine ?? "Choose from open clinician calendars."}
              </p>
            </div>
          </RevealOnScroll>

          {/* Right — headline + CTAs */}
          <RevealOnScroll delay={150}>
            <div>
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.98]"
                style={{
                  fontSize: "clamp(2.25rem,4.5vw,4rem)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {i18n?.headlinePre ?? "Book care with a"}{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>
                  {i18n?.headlineAccent ?? "clinician"}
                </span>{" "}
                {i18n?.headlinePost ?? "you choose."}
              </h2>
              <p
                className="mt-6 leading-relaxed"
                style={{
                  fontSize: "var(--text-body-lg)",
                  color: "rgba(255,255,255,0.52)",
                  maxWidth: "50ch",
                }}
              >
                {i18n?.body ??
                  "Browse licensed doctors registered with national medical councils across Europe, then choose an open appointment time where availability is shown."}
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={primaryHref}
                  className="gh2-btn-lime gh-focus-on-dark"
                >
                  {i18n?.primaryCta ?? "Book Appointment"}
                  <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
                </Link>
                <Link
                  href={secondaryHref}
                  className="gh2-btn-ghost gh-focus-on-dark"
                >
                  {i18n?.secondaryCta ?? "View doctors"}
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
