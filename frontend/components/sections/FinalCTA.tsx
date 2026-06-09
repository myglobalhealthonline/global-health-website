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
      className="
        relative overflow-hidden
        bg-[var(--color-background-dark)]
        gh-medical-pattern gh-medical-pattern-dark
      "
    >
      {/* Lime atmospheric glow — toned to 10% max so it reads as warmth,
        * not a spotlight. Single source, top-right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 500px at 95% -10%, rgba(176, 241, 34, 0.10), transparent 60%)",
        }}
      />

      <div
        className="
          relative z-[1]
          mx-auto max-w-[var(--container-width)]
          px-5 md:px-10
          gh-section
        "
      >
        {/* Top rule */}
        <div aria-hidden style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: "clamp(48px,6vw,80px)" }} />

        {/* Main grid */}
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20 items-end">
          {/* Left — oversized lime stat */}
          <RevealOnScroll delay={0}>
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                {i18n?.eyebrow ?? "Subject to availability"}
              </p>
              <p
                className="font-extrabold leading-none tracking-[-0.05em] [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(5rem,13vw,9rem)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {i18n?.liveLabel ?? "Live"}
              </p>
              <p
                className="mt-5 font-bold tracking-[-0.02em]"
                style={{
                  fontSize: "clamp(1.1rem,2vw,1.5rem)",
                  color: "rgba(255,255,255,0.55)",
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
              className="font-extrabold tracking-[-0.035em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem,4vw,3.25rem)",
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

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={primaryHref} className="gh-btn gh-btn-ghost-dark">
                {i18n?.primaryCta ?? "Book Appointment"}
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 border border-white/20 bg-transparent text-sm font-semibold text-white/75 hover:bg-white/08 hover:border-white/38 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
